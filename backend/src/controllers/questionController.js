const Question = require('../models/Question');
const University = require('../models/University');
const FAQ = require('../models/FAQ');
const Exam = require('../models/Exam');
const { generateGeminiReply } = require('../utils/gemini');

exports.getQuestions = async (req, res) => {
  try {
    const { category, universityId } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (universityId) {
      filter.universityId = universityId;
    }

    const questions = await Question.find(filter)
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('userId', 'name avatar')
      .populate('answers.userId', 'name avatar');

    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Question title and content are required' });
    }

    const question = await Question.create({
      ...req.body,
      title,
      content,
      userId: req.user._id,
    });

    res.status(201).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.postAnswer = async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ success: false, message: 'Answer content is required' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    question.answers.push({ userId: req.user._id, content });
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
    if (question.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only question owner can mark best answer' });
    }

    question.answers.forEach((answer) => {
      answer.isBestAnswer = answer._id.toString() === req.params.answerId;
    });

    await question.save();
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateQuestionHelp = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const promptText = [title, content].filter(Boolean).join('\n');
    if (!promptText.trim()) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    // --- Dynamic Context Extraction (RAG) ---
    // 1. Check for specific university mentions in the prompt
    let specificUniversity = null;
    const allUniversities = await University.find({}).select('name');
    const mentionedUniv = allUniversities.find(u => 
      promptText.toLowerCase().includes(u.name.toLowerCase()) || 
      (u.name.split(' ').length > 1 && promptText.toLowerCase().includes(u.name.split(' ')[0].toLowerCase()))
    );

    if (mentionedUniv) {
      specificUniversity = await University.findById(mentionedUniv._id).select('name state city stats description nirfRank admissions courses slug').populate('courses', 'name duration fees');
    }

    // 2. Fetch general site context
    const [topUniversities, recentFAQs, upcomingExams] = await Promise.all([
      University.find({ type: { $ne: 'foreign' } }).sort({ nirfRank: 1, 'stats.rating': -1 }).limit(3).select('name state city stats description nirfRank slug'),
      FAQ.find({ isPublished: true }).limit(3).select('question answer'),
      Exam.find({}).limit(3).select('name registrationEndDate examDate website'),
    ]);

    let siteContext = 'Current Website Knowledge Base:\n';
    
    if (specificUniversity) {
      siteContext += `\nDETAILED INFO FOR ${specificUniversity.name.toUpperCase()}:\n`;
      siteContext += `- Direct Page URL: /universities/${specificUniversity.slug}\n`;
      siteContext += `- Location: ${specificUniversity.city}, ${specificUniversity.state}\n`;
      siteContext += `- NIRF Rank: ${specificUniversity.nirfRank || 'N/A'}\n`;
      siteContext += `- Average Package: ${specificUniversity.stats?.avgPackageLPA || 'N/A'} LPA\n`;
      siteContext += `- Highest Package: ${specificUniversity.stats?.highestPackageLPA || 'N/A'} LPA\n`;
      siteContext += `- Admission Overview: ${specificUniversity.admissions?.overview || 'Standard process'}\n`;
      if (specificUniversity.admissions?.process?.length > 0) {
        siteContext += `- Admission Steps: ${specificUniversity.admissions.process.join(' -> ')}\n`;
      }
      siteContext += `- Description: ${specificUniversity.description}\n`;
    }


    if (topUniversities.length > 0) {
      siteContext += '\nGeneral Top Universities Featured:\n' + topUniversities.map(u => 
        `- ${u.name} (${u.city}, ${u.state}): NIRF Rank ${u.nirfRank || 'N/A'}, Avg Package ${u.stats?.avgPackageLPA || 'N/A'} LPA.`
      ).join('\n');
    }

    if (recentFAQs.length > 0) {
      siteContext += '\nFrequently Asked:\n' + recentFAQs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n');
    }

    if (upcomingExams.length > 0) {
      siteContext += '\nUpcoming Exams:\n' + upcomingExams.map(e => 
        `- ${e.name}: Registration ends ${e.registrationEndDate ? e.registrationEndDate.toDateString() : 'TBA'}.`
      ).join('\n');
    }

    const suggestion = await generateGeminiReply({
      prompt: promptText,
      category,
      context: siteContext || 'Focus on Indian universities, admissions, exams, fees, placements, scholarships, and application strategy.',
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


