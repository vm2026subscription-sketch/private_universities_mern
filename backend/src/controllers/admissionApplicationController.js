const crypto = require('crypto');
const mongoose = require('mongoose');
const AdmissionApplication = require('../models/AdmissionApplication');
const Course = require('../models/Course');
const { logAction } = require('../services/auditService');
const {
  canonicalStream,
  streamVariants,
  stateVariants,
  canonicalCourseKey,
  courseMatchRegex,
} = require('../utils/courseTaxonomy');
const { escapeRegExp } = require('../utils/regex');

const APPLICATION_STATUSES = [
  'new', 'contacted', 'counselling', 'documents_pending', 'applied', 'admitted', 'closed',
];

const clean = (value, maxLength = 160) => String(value == null ? '' : value)
  .replace(/[\u0000-\u001F\u007F]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const publishedNormalUniversityMatch = (path = 'university') => ({
  $and: [
    {
      $or: [
        { [`${path}.status`]: 'published' },
        { [`${path}.status`]: { $exists: false } },
      ],
    },
    {
      $or: [
        { [`${path}.segment`]: 'normal' },
        {
          [`${path}.segment`]: { $exists: false },
          [`${path}.type`]: { $nin: ['foreign', 'twinning', 'public'] },
        },
      ],
    },
  ],
});

const baseCatalogPipeline = () => ([
  {
    $lookup: {
      from: 'universities',
      localField: 'universityId',
      foreignField: '_id',
      as: 'university',
    },
  },
  { $unwind: '$university' },
  { $match: publishedNormalUniversityMatch() },
]);

const courseFilter = ({ stream, course, branch } = {}) => {
  const filter = {};
  if (stream) filter.stream = { $in: streamVariants(stream) };
  if (course) {
    const regex = courseMatchRegex(course);
    filter.$or = [{ baseCourse: regex }, { name: regex }];
  }
  if (branch && branch !== 'Any branch / specialization') {
    const exactBranch = new RegExp(`^${escapeRegExp(branch)}$`, 'i');
    filter.$and = [{
      $or: [
        { specializationName: exactBranch },
        { 'specializations.name': exactBranch },
      ],
    }];
  }
  return filter;
};

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const normalizePhone = (value) => clean(value, 24).replace(/[^\d+]/g, '');
const isPhone = (value) => /^(?:\+91)?[6-9]\d{9}$/.test(value);

const buildApplicationNumber = () => {
  const date = new Date();
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `VM-ADM-${year}${month}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

const findEligibleUniversities = async ({ stream, course, branch, preferredState, ids }) => {
  const filter = courseFilter({ stream, course, branch });
  if (ids) filter.universityId = { $in: ids };

  const pipeline = [
    { $match: filter },
    ...baseCatalogPipeline(),
    {
      $match: {
        'university.state': { $in: stateVariants(preferredState) },
      },
    },
    {
      $group: {
        _id: '$university._id',
        name: { $first: '$university.name' },
        slug: { $first: '$university.slug' },
        city: { $first: '$university.city' },
        state: { $first: '$university.state' },
        logoUrl: { $first: '$university.logoUrl' },
        naacGrade: { $first: '$university.naacGrade' },
        nirfRank: { $first: '$university.nirfRank' },
        avgFees: { $first: '$university.stats.avgFees' },
      },
    },
    { $sort: { nirfRank: 1, name: 1 } },
  ];

  return Course.aggregate(pipeline);
};

exports.getCatalogOptions = async (req, res) => {
  try {
    const resource = clean(req.params.resource, 30).toLowerCase();
    const stream = clean(req.query.stream);
    const course = clean(req.query.course);
    const branch = clean(req.query.branch);
    const preferredState = clean(req.query.state);

    if (!['streams', 'courses', 'branches', 'states', 'universities'].includes(resource)) {
      return res.status(404).json({ success: false, message: 'Admission catalog option not found' });
    }

    if (resource === 'streams') {
      const rows = await Course.aggregate([
        ...baseCatalogPipeline(),
        { $group: { _id: '$stream', universityIds: { $addToSet: '$universityId' } } },
      ]);
      const buckets = new Map();
      rows.forEach((row) => {
        const label = canonicalStream(row._id) || 'Others';
        const set = buckets.get(label) || new Set();
        row.universityIds.forEach((id) => set.add(String(id)));
        buckets.set(label, set);
      });
      const data = [...buckets.entries()]
        .map(([label, ids]) => ({ value: label, label, universityCount: ids.size }))
        .sort((a, b) => b.universityCount - a.universityCount || a.label.localeCompare(b.label));
      res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
      return res.json({ success: true, data });
    }

    if (!stream) {
      return res.status(400).json({ success: false, message: 'Please select a stream first' });
    }

    if (resource === 'courses') {
      const rows = await Course.aggregate([
        { $match: courseFilter({ stream }) },
        ...baseCatalogPipeline(),
        {
          $group: {
            _id: {
              $cond: [
                { $gt: [{ $strLenCP: { $ifNull: ['$baseCourse', ''] } }, 0] },
                '$baseCourse',
                '$name',
              ],
            },
            count: { $sum: 1 },
            universityIds: { $addToSet: '$universityId' },
          },
        },
      ]);
      const buckets = new Map();
      rows.forEach((row) => {
        const label = clean(row._id);
        const key = canonicalCourseKey(label);
        if (!key || !label) return;
        const bucket = buckets.get(key) || { labels: new Map(), universityIds: new Set() };
        bucket.labels.set(label, (bucket.labels.get(label) || 0) + row.count);
        row.universityIds.forEach((id) => bucket.universityIds.add(String(id)));
        buckets.set(key, bucket);
      });
      const data = [...buckets.values()].map((bucket) => {
        const label = [...bucket.labels.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return { value: label, label, universityCount: bucket.universityIds.size };
      }).sort((a, b) => b.universityCount - a.universityCount || a.label.localeCompare(b.label));
      res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
      return res.json({ success: true, data });
    }

    if (!course) {
      return res.status(400).json({ success: false, message: 'Please select a course first' });
    }

    if (resource === 'branches') {
      const rows = await Course.aggregate([
        { $match: courseFilter({ stream, course }) },
        ...baseCatalogPipeline(),
        {
          $project: {
            names: {
              $setUnion: [
                [{ $ifNull: ['$specializationName', ''] }],
                {
                  $map: {
                    input: { $ifNull: ['$specializations', []] },
                    as: 'specialization',
                    in: { $ifNull: ['$$specialization.name', ''] },
                  },
                },
              ],
            },
          },
        },
        { $unwind: '$names' },
        { $match: { names: { $nin: ['', 'General', null] } } },
        { $group: { _id: '$names' } },
        { $sort: { _id: 1 } },
      ]);
      const data = rows.map((row) => ({ value: row._id, label: row._id }));
      res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
      return res.json({ success: true, data });
    }

    if (resource === 'states') {
      const rows = await Course.aggregate([
        { $match: courseFilter({ stream, course, branch }) },
        ...baseCatalogPipeline(),
        { $group: { _id: '$university.state', universityIds: { $addToSet: '$universityId' } } },
        { $sort: { _id: 1 } },
      ]);
      const data = rows.filter((row) => row._id).map((row) => ({
        value: row._id,
        label: row._id,
        universityCount: row.universityIds.length,
      }));
      res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
      return res.json({ success: true, data });
    }

    if (!preferredState) {
      return res.status(400).json({ success: false, message: 'Please select a preferred state first' });
    }

    const data = await findEligibleUniversities({ stream, course, branch, preferredState });
    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    return res.json({ success: true, data, total: data.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitApplication = async (req, res) => {
  try {
    const fullName = clean(req.body.fullName, 100);
    const email = clean(req.body.email, 180).toLowerCase();
    const phone = normalizePhone(req.body.phone);
    const currentCity = clean(req.body.currentCity, 100);
    const currentState = clean(req.body.currentState, 100);
    const stream = clean(req.body.stream);
    const course = clean(req.body.course);
    const branch = clean(req.body.branch);
    const preferredState = clean(req.body.preferredState, 100);
    const entranceExam = clean(req.body.entranceExam, 100);
    const entranceScore = clean(req.body.entranceScore, 80);
    const message = clean(req.body.message, 1000);
    const selectedIds = [...new Set(
      (Array.isArray(req.body.selectedUniversityIds) ? req.body.selectedUniversityIds : [])
        .map(String)
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    )].map((id) => new mongoose.Types.ObjectId(id));

    if (!fullName || !email || !phone || !currentCity || !currentState || !stream || !course || !preferredState) {
      return res.status(400).json({ success: false, message: 'Please complete all required application fields' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    if (!isPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number' });
    }
    if (selectedIds.length < 1 || selectedIds.length > 5) {
      return res.status(400).json({ success: false, message: 'Please select between 1 and 5 universities' });
    }
    if (req.body.consent !== true) {
      return res.status(400).json({ success: false, message: 'Please accept the counselling consent to continue' });
    }

    let class12Percentage;
    if (req.body.class12Percentage !== '' && req.body.class12Percentage != null) {
      class12Percentage = Number(req.body.class12Percentage);
      if (!Number.isFinite(class12Percentage) || class12Percentage < 0 || class12Percentage > 100) {
        return res.status(400).json({ success: false, message: 'Class 12 percentage must be between 0 and 100' });
      }
    }

    const eligible = await findEligibleUniversities({
      stream, course, branch, preferredState, ids: selectedIds,
    });
    if (eligible.length !== selectedIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected universities no longer match your preference. Please refresh the list.',
      });
    }

    const application = await AdmissionApplication.create({
      applicationNumber: buildApplicationNumber(),
      fullName,
      email,
      phone,
      currentCity,
      currentState,
      class12Percentage,
      entranceExam,
      entranceScore,
      preference: { stream, course, branch, preferredState },
      selectedUniversities: eligible.map((university) => ({
        university: university._id,
        name: university.name,
        slug: university.slug,
        city: university.city,
        state: university.state,
      })),
      message,
      consent: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Your admission request has been submitted successfully.',
      data: {
        applicationNumber: application.applicationNumber,
        submittedAt: application.createdAt,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Please submit the form again to generate a new application number' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const status = clean(req.query.status, 30);
    const search = clean(req.query.search, 120);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
    const filter = {};
    if (status && status !== 'all' && APPLICATION_STATUSES.includes(status)) filter.status = status;
    if (search) {
      const regex = new RegExp(escapeRegExp(search), 'i');
      filter.$or = [
        { applicationNumber: regex }, { fullName: regex }, { email: regex }, { phone: regex },
      ];
    }

    const [applications, total, statusCounts] = await Promise.all([
      AdmissionApplication.find(filter)
        .populate('handledBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdmissionApplication.countDocuments(filter),
      AdmissionApplication.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return res.json({
      success: true,
      data: applications,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      statusCounts: Object.fromEntries(statusCounts.map((item) => [item._id, item.count])),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateApplication = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Admission application not found' });
    }
    const status = clean(req.body.status, 30);
    const adminNotes = clean(req.body.adminNotes, 3000);
    if (!APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid application status' });
    }

    const before = await AdmissionApplication.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ success: false, message: 'Admission application not found' });

    const updates = { status, adminNotes, handledBy: req.user._id };
    if (status === 'contacted' && before.status !== 'contacted') updates.lastContactedAt = new Date();
    const application = await AdmissionApplication.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('handledBy', 'name email');

    await logAction({
      userId: req.user._id,
      action: 'status_change',
      resource: 'AdmissionApplication',
      resourceId: application._id,
      description: `Updated ${application.applicationNumber} from ${before.status} to ${status}`,
      changes: { before: { status: before.status }, after: { status } },
      req,
    });

    return res.json({ success: true, data: application });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeApplication = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Admission application not found' });
    }
    const application = await AdmissionApplication.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: 'Admission application not found' });
    await logAction({
      userId: req.user._id,
      action: 'delete',
      resource: 'AdmissionApplication',
      resourceId: application._id,
      description: `Deleted admission application ${application.applicationNumber}`,
      req,
    });
    return res.json({ success: true, message: 'Admission application deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
