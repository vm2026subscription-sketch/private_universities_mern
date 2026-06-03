const Question = require('../models/Question');
const University = require('../models/University');
const FAQ = require('../models/FAQ');
const Exam = require('../models/Exam');
const { generateGeminiReply } = require('../utils/gemini');
const AI_TIMEOUT_MS = 12000;

const includesAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

const buildFallbackSuggestion = ({ promptText, specificUniversity, topUniversities, recentFAQs, upcomingExams }) => {
  const normalizedPrompt = String(promptText || '').toLowerCase();
  const lines = [];
  const asksAboutComparison = includesAny(normalizedPrompt, ['compare', 'vs', 'better']);
  const asksAboutFees = includesAny(normalizedPrompt, ['fee', 'fees', 'budget', 'roi', 'afford']);
  const asksAboutAdmissions = includesAny(normalizedPrompt, ['admission', 'apply', 'eligibility', 'admissions']);
  const asksAboutPlacements = includesAny(normalizedPrompt, ['placement', 'placements', 'career', 'package', 'salary']);
  const asksAboutExams = includesAny(normalizedPrompt, ['exam', 'jee', 'neet', 'cuet', 'cat', 'gate', 'registration', 'deadline']);
  const asksAboutRecommendations = includesAny(normalizedPrompt, ['best', 'top', 'recommend', 'suggest', 'which college', 'which university']);

  if (specificUniversity) {
    lines.push(`${specificUniversity.name} is available on the platform.`);
    lines.push(`Location: ${specificUniversity.city}, ${specificUniversity.state}.`);

    if (specificUniversity.nirfRank) {
      lines.push(`NIRF Rank: ${specificUniversity.nirfRank}.`);
    }

    if (specificUniversity.stats?.avgPackageLPA) {
      lines.push(`Average package: ${specificUniversity.stats.avgPackageLPA} LPA.`);
    }
  }

  if (asksAboutComparison) {
    lines.push('For a strong comparison, check fees, placement trends, campus location, entrance requirements, and course fit side by side.');
  } else if (asksAboutFees) {
    lines.push('Start by shortlisting universities within your budget, then compare annual fees, scholarships, hostel costs, and placement outcomes.');
  } else if (asksAboutAdmissions) {
    lines.push('Focus first on eligibility, accepted entrance exams, application deadlines, required documents, and the total first-year cost before applying.');
  } else if (asksAboutPlacements) {
    lines.push('Check average package, highest package, recruiter list, internship access, and whether the specialization matches your target job role.');
  } else if (asksAboutRecommendations) {
    if (topUniversities.length > 0) {
      const names = topUniversities.map((university) => university.name).slice(0, 3).join(', ');
      lines.push(`A practical shortlist to start with is ${names}. Compare them on fees, placements, location, and course fit.`);
    } else {
      lines.push('The university catalogue is still being rebuilt, so I cannot give a reliable shortlist yet. Share your course, budget, state, and exam details and I can still guide your decision criteria.');
    }
  } else {
    lines.push('Please share your course interest, budget, preferred state, and any entrance exam or rank details so I can answer more precisely.');
  }

  if (topUniversities.length > 0 && (asksAboutRecommendations || asksAboutComparison || asksAboutAdmissions || asksAboutPlacements)) {
    const names = topUniversities.map((university) => university.name).slice(0, 3).join(', ');
    lines.push(`Relevant options on the platform include ${names}.`);
  }

  if (upcomingExams.length > 0 && asksAboutExams) {
    const nextExam = upcomingExams[0];
    lines.push(`Upcoming exam to watch: ${nextExam.name}${nextExam.registrationDeadline ? ` - registration closes on ${nextExam.registrationDeadline.toDateString()}` : ''}.`);
  }

  if (recentFAQs.length > 0 && (asksAboutAdmissions || asksAboutFees || asksAboutRecommendations)) {
    lines.push(`Common student concern: ${recentFAQs[0].question}`);
  }

  return lines.filter(Boolean).join(' ');
};

exports.getQuestions = async (req, res) => {
  try {
    const { category, universityId, limit } = req.query;
    const filter = {};
    const normalizedLimit = Number.isFinite(Number(limit))
      ? Math.min(Math.max(parseInt(limit, 10) || 0, 1), 20)
      : null;

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (universityId) {
      filter.universityId = universityId;
    }

    let query = Question.find(filter)
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    if (normalizedLimit) {
      query = query.limit(normalizedLimit);
    }

    const questions = await query;

    res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
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

    const idx = question.upvotes.findIndex((userId) => userId.toString() === req.user._id.toString());
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
    const { title, content, category, mode } = req.body;
    // mode: 'general' (default Gemini) | 'expert' (University Expert counselor)
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
      specificUniversity = await University.findById(mentionedUniv._id)
        .select('name state city stats description nirfRank admissions courses slug')
        .populate('courses', 'name duration feesPerYear');
    }

    // 2. Fetch general site context
    const [topUniversities, recentFAQs, upcomingExams] = await Promise.all([
      University.find({
        $or: [
          { segment: 'normal' },
          { segment: { $exists: false }, type: { $nin: ['foreign', 'twinning'] } },
        ],
      }).sort({ nirfRank: 1, 'stats.rating': -1 }).limit(3).select('name state city stats description nirfRank slug'),
      FAQ.find({ isPublished: true }).limit(3).select('question answer'),
      Exam.find({}).limit(3).select('name registrationDeadline examDate officialUrl'),
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
        `- ${e.name}: Registration ends ${e.registrationDeadline ? e.registrationDeadline.toDateString() : 'TBA'}.`
      ).join('\n');
    }

    try {
      const suggestion = await Promise.race([
        generateGeminiReply({
          prompt: promptText,
          category,
          context: siteContext || 'Focus on Indian universities, admissions, exams, fees, placements, scholarships, and application strategy.',
          mode: 'general',
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI response timed out')), AI_TIMEOUT_MS);
        }),
      ]);

      return res.json({ success: true, data: { suggestion, fallbackUsed: false } });
    } catch (aiError) {
      console.error('Gemini Error:', aiError);

      const fallbackSuggestion = buildFallbackSuggestion({
        promptText,
        specificUniversity,
        topUniversities,
        recentFAQs,
        upcomingExams,
      });

      return res.json({
        success: true,
        data: {
          suggestion: fallbackSuggestion || 'I can help with admissions, exams, fees, and university shortlisting. Please share your course, budget, preferred state, and exam details for a better answer.',
          fallbackUsed: true,
        },
      });
    }
  } catch (error) {
    console.error('Question Assist Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to generate AI help right now',
    });
  }
};


