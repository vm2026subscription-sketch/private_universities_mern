const SiteSetting = require('../models/SiteSetting');
const { logAction } = require('../services/auditService');

exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const settings = await SiteSetting.find(filter).sort({ category: 1, key: 1 });
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upsertSetting = async (req, res) => {
  try {
    const { key, value, category, label, description, type } = req.body;
    if (!key || !label) return res.status(400).json({ success: false, message: 'Key and label are required' });

    const existing = await SiteSetting.findOne({ key });
    let setting;

    if (existing) {
      const before = { value: existing.value };
      existing.value = value;
      if (category) existing.category = category;
      if (label) existing.label = label;
      if (description !== undefined) existing.description = description;
      if (type) existing.type = type;
      setting = await existing.save();
      await logAction({ userId: req.user._id, action: 'update', resource: 'SiteSetting', resourceId: setting._id, description: `Updated setting: ${key}`, changes: { before, after: { value } }, req });
    } else {
      setting = await SiteSetting.create({ key, value, category, label, description, type });
      await logAction({ userId: req.user._id, action: 'create', resource: 'SiteSetting', resourceId: setting._id, description: `Created setting: ${key}`, req });
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkUpsertSettings = async (req, res) => {
  try {
    const settings = req.body.settings || [];
    const results = [];

    for (const item of settings) {
      const existing = await SiteSetting.findOne({ key: item.key });
      if (existing) {
        existing.value = item.value;
        if (item.label) existing.label = item.label;
        if (item.category) existing.category = item.category;
        if (item.type) existing.type = item.type;
        results.push(await existing.save());
      } else {
        results.push(await SiteSetting.create(item));
      }
    }

    await logAction({ userId: req.user._id, action: 'settings_change', resource: 'SiteSetting', description: `Bulk updated ${results.length} settings`, req });
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSetting = async (req, res) => {
  try {
    const setting = await SiteSetting.findByIdAndDelete(req.params.id);
    if (!setting) return res.status(404).json({ success: false, message: 'Setting not found' });
    await logAction({ userId: req.user._id, action: 'delete', resource: 'SiteSetting', resourceId: setting._id, description: `Deleted setting: ${setting.key}`, req });
    res.json({ success: true, message: 'Setting deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public endpoint
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await SiteSetting.find({});
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });
    res.json({ success: true, data: settingsMap });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
