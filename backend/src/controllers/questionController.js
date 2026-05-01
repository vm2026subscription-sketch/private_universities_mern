const Question = require('../models/Question');
const { generateGeminiReply } = require('../utils/gemini');

exports.getQuestions = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== 'all' ? { category } : {};
    const questions = await Question.find(filter).populate('userId', 'name avatar').sort({ createdAt: -1 });
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('userId', 'name avatar').populate('answers.userId', 'name avatar');
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const question = await Question.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.postAnswer = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    question.answers.push({ userId: req.user._id, content: req.body.content });
    await question.save();
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upvoteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    const idx = question.upvotes.indexOf(req.user._id);
    if (idx > -1) question.upvotes.splice(idx, 1);
    else question.upvotes.push(req.user._id);
    await question.save();
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markBestAnswer = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    if (question.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Only question owner can mark best answer' });
    question.answers.forEach(a => { a.isBestAnswer = a._id.toString() === req.params.answerId; });
    await question.save();
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateQuestionHelp = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const prompt = [title, content].filter(Boolean).join('\n');
    if (!prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    const suggestion = await generateGeminiReply({
      prompt,
      category,
      context: 'Focus on Indian universities, admissions, exams, fees, placements, scholarships, and application strategy.',
    });

    res.json({ success: true, data: { suggestion } });
  } catch (error) {
    console.error('Gemini Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to generate AI help right now',
    });
  }
};
