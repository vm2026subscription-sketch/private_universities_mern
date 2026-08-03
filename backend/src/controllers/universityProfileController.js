/**
 * The endpoints a university uses to edit its own record.
 *
 * Every handler here reads its target from `req.university`, which
 * requireUniversityAccess derived from the session. None of them accepts a
 * university identifier, so there is nothing in the request for a caller to
 * point at somebody else's record — see middleware/universityTenancy.js.
 *
 * What may be written, and whether it goes live or waits for an admin, is
 * decided entirely by config/universityEditPolicy.js. Keeping that policy out of
 * the handlers means the answer to "can a university change X?" is one file
 * anybody can read, rather than something to be reconstructed from control flow.
 */

const University = require('../models/University');
const { logAction } = require('../services/auditService');
const {
  classifyUpdate,
  SELF_SERVE_FIELDS,
  REVIEW_REQUIRED_FIELDS,
} = require('../config/universityEditPolicy');

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

const MAX_GALLERY_IMAGES = 40;

/** Cloudinary is the only image host we write, so reject anything else. */
const isAcceptableImageUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return false;
  if (!/^https:\/\//i.test(url)) return false;
  return url.length <= 500;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Read                                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The university's own record, plus what it is allowed to do with it.
 *
 * The policy travels with the payload so the dashboard can mark review-gated
 * inputs without hardcoding a second copy of the field list that would drift
 * from the server's.
 */
exports.getMyUniversity = async (req, res) => {
  try {
    const university = req.university;

    return res.json({
      success: true,
      university,
      pendingChanges: university.pendingChanges?.data || null,
      pendingSubmittedAt: university.pendingChanges?.submittedAt || null,
      policy: {
        selfServe: SELF_SERVE_FIELDS,
        reviewRequired: REVIEW_REQUIRED_FIELDS,
      },
    });
  } catch (error) {
    console.error('[university-profile] getMyUniversity failed:', error);
    return fail(res, 500, 'Could not load your university.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Update                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Partial update. Applies self-serve fields immediately and queues the rest.
 *
 * A single request routinely contains both kinds — a university editing its
 * "About" page and its placement percentage in one form submission — so the
 * response reports each group separately instead of picking one outcome for the
 * whole call.
 */
exports.updateMyUniversity = async (req, res) => {
  try {
    const university = req.university;
    const { selfServe, review, rejected: unknownFields } = classifyUpdate(req.body);

    // Platform-controlled fields were already removed by
    // stripPlatformControlledFields, so classifyUpdate never sees them. Merging
    // them back in here keeps the response honest about everything that did not
    // save, whichever layer refused it.
    const rejected = [...(req.strippedFields || []), ...unknownFields];

    if (!Object.keys(selfServe).length && !Object.keys(review).length) {
      return fail(res, 400, 'No editable fields were supplied.', { rejected });
    }

    const before = {};
    Object.keys(selfServe).forEach((path) => {
      before[path] = university.get(path);
    });

    // Live fields.
    Object.entries(selfServe).forEach(([path, value]) => {
      university.set(path, value);
    });

    // Queued fields are merged into any existing queue rather than replacing it,
    // so editing placement today does not silently discard the NAAC grade
    // submitted yesterday and still awaiting the same admin.
    if (Object.keys(review).length) {
      university.pendingChanges = {
        data: { ...(university.pendingChanges?.data || {}), ...review },
        submittedAt: new Date(),
        submittedBy: req.user._id,
      };
    }

    await university.save();

    if (Object.keys(selfServe).length) {
      await logAction({
        userId: req.user._id,
        action: 'update',
        resource: 'university_profile',
        resourceId: university._id,
        description: `Updated ${Object.keys(selfServe).join(', ')}`,
        changes: { before, after: selfServe },
        req,
      });
    }

    if (Object.keys(review).length) {
      await logAction({
        userId: req.user._id,
        action: 'update',
        resource: 'university_profile_review',
        resourceId: university._id,
        description: `Submitted for review: ${Object.keys(review).join(', ')}`,
        changes: { before: null, after: review },
        req,
      });
    }

    return res.json({
      success: true,
      message: Object.keys(review).length
        ? 'Saved. Some changes need our team to verify them before they appear publicly.'
        : 'Saved.',
      applied: Object.keys(selfServe),
      awaitingReview: Object.keys(review),
      rejected,
      university,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return fail(res, 400, Object.values(error.errors)[0]?.message || 'Invalid value supplied.');
    }
    console.error('[university-profile] updateMyUniversity failed:', error);
    return fail(res, 500, 'Could not save your changes.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Gallery                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Appends images. Separate from the generic update because the dashboard adds
 * photos one batch at a time, and a whole-array replace would make two people
 * uploading concurrently silently erase each other's work.
 */
exports.addGalleryImages = async (req, res) => {
  try {
    // Accepts a batch (`images`) or a single image under either key. `url` is
    // supported because the dashboard uploads one file at a time and names it
    // that; rejecting it would be a naming argument, not a safety one.
    const incoming = Array.isArray(req.body.images)
      ? req.body.images
      : [req.body.imageUrl ?? req.body.url];

    const urls = incoming.map((u) => String(u || '').trim()).filter(Boolean);

    if (!urls.length) return fail(res, 400, 'No image URLs supplied.');

    const invalid = urls.filter((u) => !isAcceptableImageUrl(u));
    if (invalid.length) {
      return fail(res, 400, 'Images must be uploaded through the upload endpoint first (https URLs only).');
    }

    const university = req.university;
    const existing = university.campus?.galleryImages || [];

    // Deduplicate so re-submitting a batch after a flaky connection does not
    // produce visible duplicates in the gallery.
    const merged = [...new Set([...existing, ...urls])];

    if (merged.length > MAX_GALLERY_IMAGES) {
      return fail(res, 400, `A gallery may hold at most ${MAX_GALLERY_IMAGES} images.`);
    }

    university.set('campus.galleryImages', merged);
    await university.save();

    await logAction({
      userId: req.user._id,
      action: 'update',
      resource: 'university_gallery',
      resourceId: university._id,
      description: `Added ${merged.length - existing.length} gallery image(s)`,
      req,
    });

    return res.json({
      success: true,
      message: 'Gallery updated.',
      galleryImages: merged,
    });
  } catch (error) {
    console.error('[university-profile] addGalleryImages failed:', error);
    return fail(res, 500, 'Could not update the gallery.');
  }
};

/** Removes one image by URL. */
exports.removeGalleryImage = async (req, res) => {
  try {
    const target = String(req.body.imageUrl || '').trim();
    if (!target) return fail(res, 400, 'imageUrl is required.');

    const university = req.university;
    const existing = university.campus?.galleryImages || [];

    if (!existing.includes(target)) {
      return fail(res, 404, 'That image is not in your gallery.');
    }

    const remaining = existing.filter((url) => url !== target);
    university.set('campus.galleryImages', remaining);
    await university.save();

    await logAction({
      userId: req.user._id,
      action: 'update',
      resource: 'university_gallery',
      resourceId: university._id,
      description: 'Removed a gallery image',
      req,
    });

    return res.json({ success: true, message: 'Image removed.', galleryImages: remaining });
  } catch (error) {
    console.error('[university-profile] removeGalleryImage failed:', error);
    return fail(res, 500, 'Could not remove the image.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Admin moderation                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

/** Universities with something waiting on a human. */
exports.listPendingReviews = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const filter = { 'pendingChanges.submittedAt': { $exists: true, $ne: null } };

    const [universities, total] = await Promise.all([
      University.find(filter)
        .select('name slug logoUrl state city pendingChanges')
        .sort({ 'pendingChanges.submittedAt': 1 }) // oldest first — nobody waits forever
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('pendingChanges.submittedBy', 'name email'),
      University.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      reviews: universities.map((u) => ({
        universityId: u._id,
        name: u.name,
        slug: u.slug,
        logoUrl: u.logoUrl,
        location: [u.city, u.state].filter(Boolean).join(', '),
        submittedAt: u.pendingChanges?.submittedAt,
        submittedBy: u.pendingChanges?.submittedBy,
        // Current vs proposed, so the reviewer can judge without a second call.
        changes: Object.entries(u.pendingChanges?.data || {}).map(([path, proposed]) => ({
          field: path,
          current: u.get(path),
          proposed,
        })),
      })),
    });
  } catch (error) {
    console.error('[university-profile] listPendingReviews failed:', error);
    return fail(res, 500, 'Could not load the review queue.');
  }
};

/**
 * Accepts queued changes.
 *
 * Optionally partial: `fields` narrows the approval so a reviewer who believes
 * the NAAC grade but not the placement percentage can accept one and leave the
 * other queued, instead of being forced to reject the whole submission.
 */
exports.approveChanges = async (req, res) => {
  try {
    const university = await University.findById(req.params.id);
    if (!university) return fail(res, 404, 'University not found');

    const queued = university.pendingChanges?.data || {};
    const queuedPaths = Object.keys(queued);
    if (!queuedPaths.length) return fail(res, 400, 'Nothing is awaiting review for this university.');

    const requested = Array.isArray(req.body.fields) && req.body.fields.length
      ? req.body.fields.filter((f) => queuedPaths.includes(f))
      : queuedPaths;

    if (!requested.length) return fail(res, 400, 'None of those fields are awaiting review.');

    const before = {};
    const after = {};
    requested.forEach((path) => {
      before[path] = university.get(path);
      after[path] = queued[path];
      university.set(path, queued[path]);
    });

    const remaining = queuedPaths.filter((path) => !requested.includes(path));

    if (remaining.length) {
      university.pendingChanges = {
        data: Object.fromEntries(remaining.map((path) => [path, queued[path]])),
        submittedAt: university.pendingChanges.submittedAt,
        submittedBy: university.pendingChanges.submittedBy,
      };
    } else {
      university.pendingChanges = undefined;
    }

    await university.save();

    await logAction({
      userId: req.user._id,
      action: 'update',
      resource: 'university_profile_review',
      resourceId: university._id,
      description: `Approved ${requested.join(', ')} for ${university.name}`,
      changes: { before, after },
      req,
    });

    return res.json({
      success: true,
      message: `Approved ${requested.length} change(s).`,
      approved: requested,
      stillPending: remaining,
    });
  } catch (error) {
    console.error('[university-profile] approveChanges failed:', error);
    return fail(res, 500, 'Could not approve the changes.');
  }
};

/** Discards queued changes. A reason is mandatory — see rejectClaim for why. */
exports.rejectChanges = async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return fail(res, 400, 'A reason is required so the university knows what to correct.');
    }

    const university = await University.findById(req.params.id);
    if (!university) return fail(res, 404, 'University not found');

    const queued = university.pendingChanges?.data || {};
    if (!Object.keys(queued).length) {
      return fail(res, 400, 'Nothing is awaiting review for this university.');
    }

    university.pendingChanges = undefined;
    await university.save();

    await logAction({
      userId: req.user._id,
      action: 'update',
      resource: 'university_profile_review',
      resourceId: university._id,
      description: `Rejected ${Object.keys(queued).join(', ')} for ${university.name} — ${reason}`,
      changes: { before: queued, after: null },
      req,
    });

    return res.json({ success: true, message: 'Changes rejected.', rejected: Object.keys(queued) });
  } catch (error) {
    console.error('[university-profile] rejectChanges failed:', error);
    return fail(res, 500, 'Could not reject the changes.');
  }
};

exports.MAX_GALLERY_IMAGES = MAX_GALLERY_IMAGES;
