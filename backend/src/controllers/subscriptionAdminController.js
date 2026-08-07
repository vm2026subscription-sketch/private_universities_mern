const Subscription = require('../models/Subscription');

/**
 * GET /admin/revenue/total
 * Aggregates total revenue across all subscriptions.
 */
/**
 * Revenue counts money that was actually taken.
 *
 * Admin-granted trials are Subscription rows with amount 0 and source 'trial'.
 * Left unfiltered they would not move the rupee totals, but they would inflate
 * the subscription COUNT and so drag average-revenue-per-subscription down — a
 * figure that then reads as customers paying less, rather than as free trials
 * being handed out.
 */
const PAID_ONLY = { source: { $ne: 'trial' } };

exports.getTotalRevenue = async (req, res) => {
  try {
    const result = await Subscription.aggregate([
      { $match: PAID_ONLY },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalSubscriptions: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = result[0]?.totalRevenue || 0;
    const totalSubscriptions = result[0]?.totalSubscriptions || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalSubscriptions,
        currency: 'INR',
      },
    });
  } catch (error) {
    console.error('[subscriptionAdminController] getTotalRevenue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch total revenue',
    });
  }
};

/**
 * GET /admin/revenue/monthly
 * Aggregates revenue grouped by year and month.
 */
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const monthlyData = await Subscription.aggregate([
      { $match: PAID_ONLY },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalRevenue: { $sum: '$amount' },
          subscriptionCount: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': -1,
          '_id.month': -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: monthlyData.length,
      data: monthlyData.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        totalRevenue: item.totalRevenue,
        subscriptionCount: item.subscriptionCount,
      })),
    });
  } catch (error) {
    console.error('[subscriptionAdminController] getMonthlyRevenue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly revenue',
    });
  }
};

/**
 * GET /admin/revenue/yearly
 * Aggregates revenue grouped by year.
 */
exports.getYearlyRevenue = async (req, res) => {
  try {
    const yearlyData = await Subscription.aggregate([
      { $match: PAID_ONLY },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
          },
          totalRevenue: { $sum: '$amount' },
          subscriptionCount: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: yearlyData.length,
      data: yearlyData.map((item) => ({
        year: item._id.year,
        totalRevenue: item.totalRevenue,
        subscriptionCount: item.subscriptionCount,
      })),
    });
  } catch (error) {
    console.error('[subscriptionAdminController] getYearlyRevenue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch yearly revenue',
    });
  }
};

/**
 * GET /admin/subscriptions/active
 * Lists all active subscriptions (expiryDate > now).
 */
exports.getActiveSubscriptions = async (req, res) => {
  try {
    const now = new Date();
    const activeSubscriptions = await Subscription.find({ expiryDate: { $gt: now } })
      .populate('universityId', 'name slug email logoUrl city state')
      .sort({ expiryDate: -1 });

    return res.status(200).json({
      success: true,
      count: activeSubscriptions.length,
      data: activeSubscriptions,
    });
  } catch (error) {
    console.error('[subscriptionAdminController] getActiveSubscriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active subscriptions',
    });
  }
};

/**
 * GET /admin/subscriptions/expired
 * Lists all expired subscriptions (expiryDate <= now).
 */
exports.getExpiredSubscriptions = async (req, res) => {
  try {
    const now = new Date();
    const expiredSubscriptions = await Subscription.find({ expiryDate: { $lte: now } })
      .populate('universityId', 'name slug email logoUrl city state')
      .sort({ expiryDate: -1 });

    return res.status(200).json({
      success: true,
      count: expiredSubscriptions.length,
      data: expiredSubscriptions,
    });
  } catch (error) {
    console.error('[subscriptionAdminController] getExpiredSubscriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch expired subscriptions',
    });
  }
};
