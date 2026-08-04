/**
 * University self-service portal — identity, claims and tenancy.
 *
 * Access model:
 *  - Anyone may apply. A `university` account is created immediately, but it
 *    carries NO tenancy: `User.universityId` stays unset until an admin approves
 *    the claim, and the login path refuses a session without it.
 *  - Approval is the only thing that grants tenancy, and it is always a human
 *    decision. The email-domain signal narrows the reviewer's attention; it never
 *    decides on its own. See utils/emailDomain.js for why an official address is
 *    neither necessary nor sufficient.
 *  - Reassigning an already-owned university is superadmin-only. It revokes a
 *    live owner's access, which is the most destructive action in this file.
 *
 * Ownership lives in exactly one place — `User.universityId`. It is never
 * mirrored onto the University document, so the two can never disagree.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');

const User = require('../models/User');
const University = require('../models/University');
const UniversityClaim = require('../models/UniversityClaim');
const sendEmail = require('../utils/sendEmail');
const { logAction } = require('../services/auditService');
const { classifyEmailDomain, needsExtraScrutiny } = require('../utils/emailDomain');
const { accountRules } = require('./authController');

const { normalizeEmail, isValidEmail, validatePassword, setVerificationCode, sendVerificationEmail } =
  accountRules;

const fail = (res, status, message, code) =>
  res.status(status).json({ success: false, ...(code ? { code } : {}), message });

const getClientUrl = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

const INVITE_TTL_HOURS = 72;

/**
 * Email failures must never abort an approval or an invite.
 *
 * The database write is the authoritative outcome; the message is a courtesy. If
 * a mail outage rolled back approvals, an unrelated provider problem would
 * silently become an access-control problem.
 */
const notify = async ({ to, subject, html }, context) => {
  try {
    await sendEmail({ to, subject, html });
  } catch (error) {
    console.error(`[university-portal] ${context} email failed for ${to}: ${error.message}`);
  }
};

const emailShell = (heading, bodyHtml) => `
  <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:520px;margin:0 auto;padding:20px;">
    <h2 style="color:#f97316;margin-bottom:8px;">${heading}</h2>
    ${bodyHtml}
    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Vidyarthi Mitra — University Portal</p>
  </div>
`;

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

/** Trimmed public view of a claim. Never leaks the reviewer's identity. */
const serializeClaim = (claim) => ({
  id: claim._id,
  status: claim.status,
  universityId: claim.university?._id || claim.university || null,
  universityName: claim.university?.name || claim.requestedUniversityName || null,
  // Location helps a reviewer tell apart similarly named institutions before
  // opening the full record.
  city: claim.university?.city || null,
  state: claim.university?.state || null,
  contactPerson: claim.contactPerson,
  designation: claim.designation,
  officialEmail: claim.officialEmail,
  phone: claim.phone,
  website: claim.website,
  emailSignal: claim.emailSignal,
  emailDomain: claim.emailDomain,
  authorizationLetterUrl: claim.authorizationLetterUrl,
  reviewNote: claim.reviewNote,
  reviewedAt: claim.reviewedAt,
  createdAt: claim.createdAt,
});

/** Admin view — adds the reviewer and the applicant account. */
const serializeClaimForAdmin = (claim) => ({
  ...serializeClaim(claim),
  needsExtraScrutiny: needsExtraScrutiny(claim.emailSignal),
  applicant: claim.user
    ? {
        id: claim.user._id || claim.user,
        name: claim.user.name,
        email: claim.user.email,
        isEmailVerified: claim.user.isEmailVerified,
        hasAccess: Boolean(claim.user.universityId),
      }
    : null,
  reviewedBy: claim.reviewedBy?._id || claim.reviewedBy || null,
  reviewedByName: claim.reviewedBy?.name || null,
  replacedOwner: claim.replacedOwner || null,
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Signup                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Creates an unapproved university account plus a pending claim.
 *
 * Deliberately permissive about WHO may apply — a free-provider address, or a
 * university already claimed by someone else, still produces a claim. Both are
 * flagged for the reviewer instead of being rejected here: auto-rejecting free
 * providers would turn away the smaller private universities this portal sells
 * to, and auto-rejecting a second claim would strand a university whose previous
 * representative has left.
 */
exports.signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      contactPerson,
      designation,
      universityId,
      requestedUniversityName,
      website,
      authorizationLetterUrl,
    } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = String(name || '').trim();
    const normalizedContact = String(contactPerson || normalizedName).trim();
    const normalizedDesignation = String(designation || '').trim();
    const normalizedPhone = String(phone || '').trim();

    if (!normalizedName || !normalizedEmail || !password) {
      return fail(res, 400, 'Name, email and password are required');
    }
    if (!isValidEmail(normalizedEmail)) {
      return fail(res, 400, 'Enter a valid email address');
    }
    if (!normalizedDesignation) {
      return fail(res, 400, 'Designation is required so we can verify your authority to represent the university');
    }
    if (!normalizedPhone) {
      return fail(res, 400, 'Phone number is required');
    }
    if (!universityId && !String(requestedUniversityName || '').trim()) {
      return fail(res, 400, 'Select your university, or tell us its name if it is not listed');
    }

    const passwordError = validatePassword(password, { name: normalizedName, email: normalizedEmail });
    if (passwordError) return fail(res, 400, passwordError);

    // ── Resolve the university being claimed ──────────────────────────────
    let university = null;
    if (universityId) {
      if (!isValidObjectId(universityId)) {
        return fail(res, 400, 'That university could not be found');
      }
      university = await University.findById(universityId).select('name website slug');
      if (!university) {
        return fail(res, 404, 'That university could not be found');
      }
    }

    /**
     * Classified against the university's OWN recorded website, never against a
     * website supplied in this request — otherwise an applicant could assert a
     * matching domain and manufacture an `official` signal for themselves.
     */
    const { signal, domain } = classifyEmailDomain(normalizedEmail, university?.website);

    // ── Resolve the applicant account ─────────────────────────────────────
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && existingUser.role !== 'university') {
      /**
       * Explicit rather than the generic anti-enumeration response used by
       * student registration. This is a low-volume B2B flow with a human
       * reviewer; swallowing the collision silently would leave a real applicant
       * waiting for a decision that was never going to come. The disclosure is
       * limited to "this address is already in use here".
       */
      return fail(
        res,
        409,
        'This email is already registered as a personal account. Please apply using your official university email address.'
      );
    }

    if (existingUser?.universityId) {
      return fail(
        res,
        409,
        'This account already manages a university. Sign in to continue.',
        'ALREADY_APPROVED'
      );
    }

    let user = existingUser;

    if (user) {
      // Re-application over an account that was never approved. Safe: no tenancy
      // has ever been granted, and none is granted here.
      user.name = normalizedName;
      user.password = password;
      user.phone = normalizedPhone || user.phone;
      user.isEmailVerified = false;
    } else {
      user = new User({
        name: normalizedName,
        email: normalizedEmail,
        password,
        phone: normalizedPhone || undefined,
        authProvider: 'local',
        status: 'active',
        isEmailVerified: false,

        // Role is set here; TENANCY is not. universityId stays unset until an
        // admin approves, and that gap is what the login path enforces.
        role: 'university',
      });
    }

    const verificationCode = setVerificationCode(user);
    await user.save();

    // ── Record the claim ──────────────────────────────────────────────────
    const claimQuery = { user: user._id, status: 'pending' };
    if (university) claimQuery.university = university._id;

    const claimData = {
      user: user._id,
      university: university?._id,
      requestedUniversityName: university ? undefined : String(requestedUniversityName).trim(),
      contactPerson: normalizedContact,
      designation: normalizedDesignation,
      officialEmail: normalizedEmail,
      phone: normalizedPhone,
      website: String(website || '').trim() || university?.website,
      authorizationLetterUrl: String(authorizationLetterUrl || '').trim() || undefined,
      emailSignal: signal,
      emailDomain: domain,
      status: 'pending',
    };

    const claim = await UniversityClaim.findOneAndUpdate(
      claimQuery,
      { $set: claimData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await sendVerificationEmail(user, verificationCode).catch((error) =>
      console.error(`[university-portal] verification email failed: ${error.message}`)
    );

    await logAction({
      userId: user._id,
      action: 'create',
      resource: 'university_claim',
      resourceId: claim._id,
      description: `University access requested for ${university?.name || claimData.requestedUniversityName} (email signal: ${signal})`,
      req,
    });

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      message:
        'Request submitted. Verify your email, then our team will review your request — usually within 2 working days.',
      claim: serializeClaim({ ...claimData, _id: claim._id, createdAt: claim.createdAt }),
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'A request for this university from this account is already pending review.');
    }
    console.error('[university-portal] signup failed:', error);
    return fail(res, 500, 'Could not submit your request. Please try again.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Applicant self-service                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

/** Where the applicant stands: pending, rejected, or approved with access. */
exports.getMyStatus = async (req, res) => {
  try {
    if (req.user.role !== 'university') {
      return fail(res, 403, 'This area is for university accounts only.');
    }

    const claim = await UniversityClaim.findOne({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('university', 'name slug website city state');

    const university = req.user.universityId
      ? await University.findById(req.user.universityId).select('name slug logoUrl website status')
      : null;

    return res.json({
      success: true,
      hasAccess: Boolean(req.user.universityId),
      universityRole: req.user.universityRole || null,
      university,
      claim: claim ? serializeClaim(claim) : null,
    });
  } catch (error) {
    console.error('[university-portal] getMyStatus failed:', error);
    return fail(res, 500, 'Could not load your request status.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Admin review                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

exports.listClaims = async (req, res) => {
  try {
    const status = String(req.query.status || 'pending');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const filter = {};
    if (status !== 'all') {
      if (!UniversityClaim.CLAIM_STATUS.includes(status)) {
        return fail(res, 400, 'Unknown status filter');
      }
      filter.status = status;
    }

    const [claims, total] = await Promise.all([
      UniversityClaim.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('university', 'name slug website city state')
        .populate('user', 'name email isEmailVerified universityId')
        .populate('reviewedBy', 'name'),
      UniversityClaim.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      claims: claims.map(serializeClaimForAdmin),
    });
  } catch (error) {
    console.error('[university-portal] listClaims failed:', error);
    return fail(res, 500, 'Could not load claims.');
  }
};

/**
 * Full review packet for one claim.
 *
 * Includes the current owner (if any) so the reviewer cannot approve a
 * reassignment without seeing whose access they are about to revoke.
 */
exports.getClaim = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid claim id');

    const claim = await UniversityClaim.findById(req.params.id)
      .populate('university', 'name slug website state city')
      .populate('user', 'name email isEmailVerified universityId createdAt')
      .populate('reviewedBy', 'name');

    if (!claim) return fail(res, 404, 'Claim not found');

    const currentOwner = claim.university
      ? await User.findOne({
          universityId: claim.university._id,
          universityRole: 'owner',
        }).select('name email createdAt')
      : null;

    return res.json({
      success: true,
      claim: serializeClaimForAdmin(claim),
      currentOwner,
      /**
       * Surfaced so the UI can require a superadmin and an explicit confirmation
       * before an approval silently displaces a live owner.
       */
      isReassignment: Boolean(currentOwner),
      verificationChecklist: [
        'Confirm the designation is senior enough to represent the university.',
        'Open the authorisation letter and check it is on university letterhead.',
        'Call the number published on the university\'s own website — NOT the number on this form.',
      ],
    });
  } catch (error) {
    console.error('[university-portal] getClaim failed:', error);
    return fail(res, 500, 'Could not load the claim.');
  }
};

/**
 * Grants tenancy.
 *
 * The only place in the codebase that writes `User.universityId` for an owner.
 * Concentrating it here means there is exactly one code path to audit for "how
 * can an account come to control a university".
 */
exports.approveClaim = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid claim id');

    const claim = await UniversityClaim.findById(req.params.id).populate('user', 'name email');
    if (!claim) return fail(res, 404, 'Claim not found');
    if (claim.status !== 'pending') {
      return fail(res, 409, `This claim has already been ${claim.status}.`);
    }

    // A claim for a university that does not exist yet cannot be approved until
    // an admin has created the university and attached it.
    const targetUniversityId = req.body.universityId || claim.university;
    if (!targetUniversityId) {
      return fail(
        res,
        400,
        'This applicant\'s university is not on the platform yet. Create the university first, then approve with its id.'
      );
    }
    if (!isValidObjectId(targetUniversityId)) return fail(res, 400, 'Invalid university id');

    const university = await University.findById(targetUniversityId).select('name slug');
    if (!university) return fail(res, 404, 'University not found');

    const applicant = await User.findById(claim.user._id || claim.user);
    if (!applicant) return fail(res, 404, 'The applicant account no longer exists.');

    /**
     * Approving before the applicant has verified their email produces an
     * account that is granted access and then permanently refused at login,
     * because the login path checks verification first. The result looks like a
     * broken sign-in rather than an unfinished signup, and nothing on either
     * screen explains it.
     *
     * It is also the wrong order on its merits: verification proves the person
     * controls the address the claim was made from, which is the one fact
     * approval should never be granted without.
     */
    if (!applicant.isEmailVerified) {
      return fail(
        res,
        409,
        `${applicant.email} has not verified their email address yet. Ask them to complete verification, then approve — approving now would grant access they cannot sign in to use.`,
        'APPLICANT_EMAIL_UNVERIFIED'
      );
    }

    const existingOwner = await User.findOne({
      universityId: university._id,
      universityRole: 'owner',
    });

    /**
     * Reassignment is a different, more dangerous operation than a first-time
     * approval: it strips a live account of its access. Gating it on superadmin
     * — rather than letting any admin do it as a side effect of clicking
     * Approve — keeps ordinary review low-risk.
     */
    if (existingOwner && !existingOwner._id.equals(applicant._id)) {
      if (req.user.role !== 'superadmin') {
        return fail(
          res,
          403,
          `${university.name} is already managed by another account. Only a superadmin can reassign it.`,
          'REASSIGNMENT_REQUIRES_SUPERADMIN'
        );
      }

      existingOwner.universityId = undefined;
      existingOwner.universityRole = undefined;
      // Ends the displaced owner's live sessions immediately rather than letting
      // their current access token run to expiry.
      existingOwner.tokenVersion = (existingOwner.tokenVersion || 0) + 1;
      await existingOwner.save();

      claim.replacedOwner = existingOwner._id;

      await logAction({
        userId: req.user._id,
        action: 'role_change',
        resource: 'university_ownership',
        resourceId: university._id,
        description: `Revoked ${existingOwner.email}'s ownership of ${university.name} during reassignment`,
        changes: { before: { owner: existingOwner.email }, after: { owner: applicant.email } },
        req,
      });

      await notify(
        {
          to: existingOwner.email,
          subject: `Your access to ${university.name} has been transferred`,
          html: emailShell(
            'Access transferred',
            `<p>Your management access to <strong>${university.name}</strong> on Vidyarthi Mitra has been transferred to another representative.</p>
             <p>If you believe this is a mistake, reply to this email straight away.</p>`
          ),
        },
        'ownership revoked'
      );
    }

    applicant.universityId = university._id;
    applicant.universityRole = 'owner';
    applicant.tokenVersion = (applicant.tokenVersion || 0) + 1;
    await applicant.save();

    claim.status = 'approved';
    claim.university = university._id;
    claim.reviewedBy = req.user._id;
    claim.reviewedAt = new Date();
    claim.reviewNote = String(req.body.note || '').trim() || undefined;
    await claim.save();

    // Any other pending claim on this university is now moot.
    await UniversityClaim.updateMany(
      { university: university._id, status: 'pending', _id: { $ne: claim._id } },
      {
        status: 'rejected',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        reviewNote: 'Another representative was approved for this university.',
      }
    );

    await logAction({
      userId: req.user._id,
      action: 'role_change',
      resource: 'university_claim',
      resourceId: claim._id,
      description: `Approved ${applicant.email} as owner of ${university.name}`,
      changes: { before: { universityId: null }, after: { universityId: String(university._id) } },
      req,
    });

    await notify(
      {
        to: applicant.email,
        subject: `Your request for ${university.name} has been approved`,
        html: emailShell(
          'Request approved',
`<p>Your request to manage <strong>${university.name}</strong> has been approved.</p>
           <p>Complete your subscription to unlock your dashboard:</p>
           <p><a href="${getClientUrl()}/university/dashboard/subscription" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Choose a plan</a></p>`
        ),
      },
      'approval'
    );

    return res.json({
      success: true,
      message: `${applicant.email} now manages ${university.name}.`,
      claim: serializeClaim(claim),
      reassigned: Boolean(claim.replacedOwner),
    });
  } catch (error) {
    console.error('[university-portal] approveClaim failed:', error);
    return fail(res, 500, 'Could not approve the claim.');
  }
};

exports.rejectClaim = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid claim id');

    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      // A rejection without a reason is unappealable and unauditable, and the
      // applicant has no way to correct whatever was wrong.
      return fail(res, 400, 'A reason is required so the applicant knows what to correct.');
    }

    const claim = await UniversityClaim.findById(req.params.id)
      .populate('user', 'name email')
      .populate('university', 'name');
    if (!claim) return fail(res, 404, 'Claim not found');
    if (claim.status !== 'pending') {
      return fail(res, 409, `This claim has already been ${claim.status}.`);
    }

    claim.status = 'rejected';
    claim.reviewedBy = req.user._id;
    claim.reviewedAt = new Date();
    claim.reviewNote = reason;
    await claim.save();

    await logAction({
      userId: req.user._id,
      action: 'status_change',
      resource: 'university_claim',
      resourceId: claim._id,
      description: `Rejected claim by ${claim.user?.email} — ${reason}`,
      req,
    });

    await notify(
      {
        to: claim.user.email,
        subject: 'Update on your university access request',
        html: emailShell(
          'Request not approved',
          `<p>We could not approve your request to manage <strong>${claim.university?.name || claim.requestedUniversityName}</strong>.</p>
           <p><strong>Reason:</strong> ${reason}</p>
           <p>You are welcome to apply again with the missing information.</p>`
        ),
      },
      'rejection'
    );

    return res.json({ success: true, message: 'Claim rejected.', claim: serializeClaim(claim) });
  } catch (error) {
    console.error('[university-portal] rejectClaim failed:', error);
    return fail(res, 500, 'Could not reject the claim.');
  }
};

/**
 * Every account that holds — or is waiting on — university access.
 *
 * Admin needs this to answer "who controls this university?" before revoking or
 * reassigning anything. Ownership lives only on the user record, so this is the
 * query that answers it; there is no mirrored field on University to read.
 */
exports.listUniversityAccounts = async (req, res) => {
  try {
    const accounts = await User.find({ role: 'university' })
      .populate('universityId', 'name slug city state')
      .select('name email universityRole universityId isEmailVerified lastLogin createdAt status')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      total: accounts.length,
      accounts: accounts.map((a) => ({
        id: a._id,
        name: a.name,
        email: a.email,
        isEmailVerified: a.isEmailVerified,
        status: a.status,
        universityRole: a.universityRole || null,
        hasAccess: Boolean(a.universityId),
        university: a.universityId
          ? {
              id: a.universityId._id,
              name: a.universityId.name,
              slug: a.universityId.slug,
              location: [a.universityId.city, a.universityId.state].filter(Boolean).join(', '),
            }
          : null,
        lastLogin: a.lastLogin,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('[university-portal] listUniversityAccounts failed:', error);
    return fail(res, 500, 'Could not load university accounts.');
  }
};

/**
 * Withdraws tenancy without going through a claim.
 *
 * Needed for the case a claim cannot express: a representative leaves and there
 * is no replacement yet, so the university should simply have no manager.
 */
exports.revokeAccess = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) return fail(res, 400, 'Invalid user id');

    const target = await User.findById(req.params.userId);
    if (!target) return fail(res, 404, 'User not found');
    if (!target.universityId) return fail(res, 400, 'This account does not manage a university.');

    const previousUniversityId = target.universityId;

    target.universityId = undefined;
    target.universityRole = undefined;
    target.tokenVersion = (target.tokenVersion || 0) + 1;
    await target.save();

    /**
     * Revoking an owner takes their invitees with them.
     *
     * Members exist only because that owner vouched for them, and an owner is
     * normally revoked because the vouching turned out to be wrong — a claim
     * that should not have been approved, or a representative who left. Removing
     * the root and leaving the people they onboarded still holding access
     * defeats the point, and nobody would be able to invite a replacement either,
     * since only an owner can invite.
     */
    let cascadedCount = 0;
    if (target.universityRole !== 'member') {
      const members = await User.find({
        universityId: previousUniversityId,
        universityRole: 'member',
      });

      for (const member of members) {
        member.universityId = undefined;
        member.universityRole = undefined;
        member.tokenVersion = (member.tokenVersion || 0) + 1;
        await member.save();
      }
      cascadedCount = members.length;
    }

    await logAction({
      userId: req.user._id,
      action: 'role_change',
      resource: 'university_ownership',
      resourceId: previousUniversityId,
      description: `Revoked ${target.email}'s access${cascadedCount ? ` and ${cascadedCount} invited member(s)` : ''}`,
      changes: { before: { universityId: String(previousUniversityId) }, after: { universityId: null } },
      req,
    });

    /**
     * The account itself is kept. `role` stays `university` with no
     * universityId, which is the same state a fresh applicant is in — so the
     * person can simply sign up again and be reviewed properly, rather than
     * discovering their email is unusable.
     */
    return res.json({
      success: true,
      message: `Access revoked for ${target.email}.${cascadedCount ? ` ${cascadedCount} invited member(s) also removed.` : ''} They can apply again.`,
      cascadedMembers: cascadedCount,
    });
  } catch (error) {
    console.error('[university-portal] revokeAccess failed:', error);
    return fail(res, 500, 'Could not revoke access.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Team members                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

const MAX_TEAM_MEMBERS = 5;

exports.listTeam = async (req, res) => {
  try {
    const team = await User.find({ universityId: req.user.universityId })
      .select('name email universityRole isEmailVerified lastLogin createdAt')
      .sort({ universityRole: 1, createdAt: 1 });

    return res.json({ success: true, team });
  } catch (error) {
    console.error('[university-portal] listTeam failed:', error);
    return fail(res, 500, 'Could not load your team.');
  }
};

/**
 * Invites a colleague as a `member`.
 *
 * Members are created already linked to the university, because the owner —
 * whose authority an admin verified — is vouching for them. They cannot invite
 * anyone further, so every account still traces back to exactly one
 * admin-approved root.
 */
exports.inviteTeamMember = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || '').trim();

    if (!name || !email) return fail(res, 400, 'Name and email are required');
    if (!isValidEmail(email)) return fail(res, 400, 'Enter a valid email address');

    const teamSize = await User.countDocuments({ universityId: req.user.universityId });
    if (teamSize >= MAX_TEAM_MEMBERS) {
      return fail(res, 400, `A university may have at most ${MAX_TEAM_MEMBERS} accounts.`);
    }

    const existing = await User.findOne({ email });

    if (existing) {
      // Inviting someone who already holds an account elsewhere would either
      // hijack their account or silently move them between tenants.
      if (!existing.universityId || !existing.universityId.equals(req.user.universityId)) {
        return fail(res, 409, 'That email already has an account. Ask them to use a different address.');
      }
      return fail(res, 409, 'That person is already on your team.');
    }

    /**
     * The raw token goes in the email; only its hash is stored. A database read
     * therefore does not yield a usable invitation.
     */
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const member = await User.create({
      name,
      email,
      // No password: the invitee sets one when accepting. Until then the account
      // cannot authenticate, because login requires a stored hash.
      role: 'university',
      universityId: req.user.universityId,
      universityRole: 'member',
      authProvider: 'local',
      status: 'active',
      isEmailVerified: false,
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000),
    });

    await logAction({
      userId: req.user._id,
      action: 'create',
      resource: 'university_team',
      resourceId: member._id,
      description: `Invited ${email} to ${req.university?.name || req.user.universityId}`,
      req,
    });

    await notify(
      {
        to: email,
        subject: `You have been invited to manage ${req.university?.name || 'your university'} on Vidyarthi Mitra`,
        html: emailShell(
          'You have been invited',
          `<p><strong>${req.user.name}</strong> has invited you to help manage
           <strong>${req.university?.name || 'their university'}</strong> on Vidyarthi Mitra.</p>
           <p><a href="${getClientUrl()}/university/accept-invite?token=${rawToken}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Accept invitation</a></p>
           <p style="color:#94a3b8;font-size:13px;">This invitation expires in ${INVITE_TTL_HOURS} hours.</p>`
        ),
      },
      'invite'
    );

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${email}.`,
      member: { id: member._id, name: member.name, email: member.email, universityRole: 'member' },
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'That email already has an account.');
    }
    console.error('[university-portal] inviteTeamMember failed:', error);
    return fail(res, 500, 'Could not send the invitation.');
  }
};

/** Sets the invitee's password and activates the account. Unauthenticated. */
exports.acceptInvite = async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');

    if (!token || !password) return fail(res, 400, 'Token and password are required');

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const member = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() },
      role: 'university',
      universityRole: 'member',
    }).select('+password');

    // One message for every failure mode, so a probe cannot distinguish an
    // expired invitation from a fabricated one.
    if (!member) return fail(res, 400, 'This invitation is invalid or has expired.');

    const passwordError = validatePassword(password, { name: member.name, email: member.email });
    if (passwordError) return fail(res, 400, passwordError);

    member.password = password;
    member.resetPasswordToken = undefined;
    member.resetPasswordExpiry = undefined;
    // Accepting via a link sent to this address proves control of the mailbox,
    // which is exactly what email verification establishes.
    member.isEmailVerified = true;
    member.tokenVersion = (member.tokenVersion || 0) + 1;
    await member.save();

    await logAction({
      userId: member._id,
      action: 'update',
      resource: 'university_team',
      resourceId: member._id,
      description: `${member.email} accepted their invitation`,
      req,
    });

    return res.json({ success: true, message: 'Invitation accepted. You can now sign in.' });
  } catch (error) {
    console.error('[university-portal] acceptInvite failed:', error);
    return fail(res, 500, 'Could not accept the invitation.');
  }
};

exports.removeTeamMember = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) return fail(res, 400, 'Invalid user id');

    const member = await User.findById(req.params.userId);
    if (!member) return fail(res, 404, 'Team member not found');

    // Scoped to the caller's own university, from the session — a member id
    // belonging to another tenant simply is not found here.
    if (!member.universityId || !member.universityId.equals(req.user.universityId)) {
      return fail(res, 404, 'Team member not found');
    }
    if (member.universityRole === 'owner') {
      return fail(res, 400, 'The owner cannot be removed. Ask an administrator to reassign the university.');
    }

    member.universityId = undefined;
    member.universityRole = undefined;
    member.tokenVersion = (member.tokenVersion || 0) + 1;
    await member.save();

    await logAction({
      userId: req.user._id,
      action: 'delete',
      resource: 'university_team',
      resourceId: member._id,
      description: `Removed ${member.email} from the team`,
      req,
    });

    return res.json({ success: true, message: `${member.email} removed from your team.` });
  } catch (error) {
    console.error('[university-portal] removeTeamMember failed:', error);
    return fail(res, 500, 'Could not remove the team member.');
  }
};

exports.MAX_TEAM_MEMBERS = MAX_TEAM_MEMBERS;
