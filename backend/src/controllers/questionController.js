const mongoose = require('mongoose');
const Question = require('../models/Question');
const University = require('../models/University');
const FAQ = require('../models/FAQ');
const Exam = require('../models/Exam');
const { generateGeminiReply } = require('../utils/gemini');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');
const { escapeRegExp } = require('../utils/regex');
const { publishedUniversityFilter, normalSegmentFilter } = require('../utils/universityFilters');
const AI_TIMEOUT_MS = 12000;

const includesAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

/* ── University mention detection for the AI assistant ──────────────────────
 *
 * This used to run `University.find({}).select('name')` on every single assist
 * request — a full collection scan that pulled every university name into the
 * process — and then scanned that array in JavaScript. It also matched on the
 * FIRST WORD of a multi-word name, so a prompt containing "Amity" or, worse,
 * "University" or "Indian" matched an arbitrary institution and fed the model a
 * confidently wrong context block.
 *
 * The replacement asks MongoDB to shortlist candidates with a bounded regex
 * query and scores that small set in Node.
 */

const PUBLISHED_UNIVERSITY = publishedUniversityFilter();

/**
 * Words too generic to identify an institution. Matching on any of these is what
 * produced the false positives, so they are excluded from both the DB query and
 * the scoring.
 */
const GENERIC_NAME_WORDS = new Set([
  'university', 'universities', 'college', 'colleges', 'institute', 'institutes',
  'institution', 'school', 'academy', 'deemed', 'private', 'national', 'international',
  'global', 'indian', 'india', 'centre', 'center', 'campus', 'group', 'trust',
  'society', 'science', 'sciences', 'technology', 'technologies', 'engineering',
  'management', 'studies', 'research', 'education', 'educational', 'and', 'the', 'for',
  'about', 'admission', 'admissions', 'course', 'courses', 'fees', 'placement',
  'placements', 'compare', 'best', 'good', 'which', 'what', 'where', 'tell',
]);

const MIN_TOKEN_LENGTH = 4;
const MAX_QUERY_TOKENS = 8;
const CANDIDATE_LIMIT = 10;

const significantTokens = (text) =>
  [
    ...new Set(
      String(text || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= MIN_TOKEN_LENGTH && !GENERIC_NAME_WORDS.has(word))
    ),
  ];

/**
 * Finds the university the prompt is asking about, if any.
 *
 * @returns {Promise<object|null>} the matched university with courses populated.
 */
const findMentionedUniversity = async (promptText) => {
  const normalizedPrompt = String(promptText || '').toLowerCase();
  const tokens = significantTokens(normalizedPrompt).slice(0, MAX_QUERY_TOKENS);
  if (!tokens.length) return null;

  // One indexable, capped query instead of loading the collection. The candidate
  // set can only contain universities whose name shares a distinctive word with
  // the prompt.
  const pattern = tokens.map(escapeRegExp).join('|');
  const candidates = await University.find({
    $and: [
      PUBLISHED_UNIVERSITY,
      { name: { $regex: pattern, $options: 'i' } },
    ],
  })
    .select('_id name')
    .limit(CANDIDATE_LIMIT);

  if (!candidates.length) return null;

  // Score in Node over at most CANDIDATE_LIMIT rows. A full-name substring match
  // always wins; otherwise the university sharing the most distinctive words with
  // the prompt does, with the longer name breaking ties (so "Amity University
  // Mumbai" beats "Amity University" when the prompt names Mumbai).
  let best = null;

  for (const candidate of candidates) {
    const name = String(candidate.name || '');
    const exact = normalizedPrompt.includes(name.toLowerCase());
    const nameTokens = significantTokens(name);
    const overlap = nameTokens.filter((word) => normalizedPrompt.includes(word)).length;

    if (!exact && overlap === 0) continue;

    const score = exact ? 1000 + name.length : overlap * 10 + Math.min(name.length, 9);
    if (!best || score > best.score) best = { candidate, score };
  }

  if (!best) return null;

  return University.findById(best.candidate._id)
    .select('name state city stats description nirfRank admissions courses slug')
    .populate('courses', 'name duration feesPerYear');
};

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
    const { category, universityId } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (universityId) {
      if (!mongoose.Types.ObjectId.isValid(universityId)) {
        return fail(res, 400, 'Invalid universityId');
      }
      filter.universityId = universityId;
    }

    // ?limit keeps working exactly as before (capped at 20); ?page now also
    // works, and the response carries the standard pagination metadata either
    // way. With neither parameter the full feed is returned, as it was.
    const { page, limit, skip, isPaginated } = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 20,
    });

    const query = Question.find(filter)
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    if (isPaginated) query.skip(skip).limit(limit);

    const [questions, total] = await Promise.all([query, Question.countDocuments(filter)]);

    res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    return paginated(res, {
      data: questions,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : null,
    });
  } catch (error) {
    return serverError(res, error, 'question.getQuestions');
  }
};

exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('userId', 'name avatar')
      .populate('answers.userId', 'name avatar');

    if (!question) return fail(res, 404, 'Question not found');
    res.json({ success: true, data: question });
  } catch (error) {
    return serverError(res, error, 'question.getQuestion');
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();

    if (!title || !content) {
      return fail(res, 400, 'Question title and content are required');
    }

    const question = await Question.create({
      ...req.body,
      title,
      content,
      userId: req.user._id,
    });

    res.status(201).json({ success: true, data: question });
  } catch (error) {
    return serverError(res, error, 'question.createQuestion');
  }
};

exports.postAnswer = async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) {
      return fail(res, 400, 'Answer content is required');
    }

    const question = await Question.findById(req.params.id);
    if (!question) return fail(res, 404, 'Question not found');

    question.answers.push({ userId: req.user._id, content });
    await question.save();
    res.json({ success: true, data: question });
  } catch (error) {
    return serverError(res, error, 'question.postAnswer');
  }
};

exports.upvoteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return fail(res, 404, 'Question not found');

    const idx = question.upvotes.findIndex((userId) => userId.toString() === req.user._id.toString());
    if (idx > -1) question.upvotes.splice(idx, 1);
    else question.upvotes.push(req.user._id);

    await question.save();
    res.json({ success: true, data: question });
  } catch (error) {
    return serverError(res, error, 'question.upvoteQuestion');
  }
};

exports.markBestAnswer = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) return fail(res, 404, 'Question not found');
    if (question.userId.toString() !== req.user._id.toString()) {
      return fail(res, 403, 'Only question owner can mark best answer');
    }

    question.answers.forEach((answer) => {
      answer.isBestAnswer = answer._id.toString() === req.params.answerId;
    });

    await question.save();
    res.json({ success: true, data: question });
  } catch (error) {
    return serverError(res, error, 'question.markBestAnswer');
  }
};

exports.upvoteAnswer = async (req, res) => {
  try {
    const { questionId, answerId } = req.params;
    const targetQuestionId = questionId || req.params.id;
    const question = await Question.findById(targetQuestionId);
    if (!question) return fail(res, 404, 'Question not found');

    const answer = question.answers.id(answerId);
    if (!answer) return fail(res, 404, 'Answer not found');

    if (!answer.upvotes) answer.upvotes = [];
    const userIdStr = req.user._id.toString();
    const idx = answer.upvotes.findIndex((uId) => uId.toString() === userIdStr);

    let voted = false;
    if (idx > -1) {
      answer.upvotes.splice(idx, 1);
      voted = false;
    } else {
      answer.upvotes.push(req.user._id);
      voted = true;
    }

    await question.save();

    const updatedQuestion = await Question.findById(targetQuestionId)
      .populate('userId', 'name avatar')
      .populate('answers.userId', 'name avatar');

    res.json({
      success: true,
      data: updatedQuestion,
      voted,
      helpfulCount: answer.upvotes.length
    });
  } catch (error) {
    return serverError(res, error, 'question.upvoteAnswer');
  }
};

exports.generateQuestionHelp = async (req, res) => {
  try {
    const { title, content, category, mode } = req.body;
    // mode: 'general' (default Gemini) | 'expert' (University Expert counselor)
    const promptText = [title, content].filter(Boolean).join('\n');
    if (!promptText.trim()) {
      return fail(res, 400, 'Question is required');
    }

    // --- Dynamic Context Extraction (RAG) ---
    // 1. Check for specific university mentions in the prompt. See
    //    findMentionedUniversity: one bounded regex query, not a collection scan.
    // 2. Fetch general site context.
    //
    // All four lookups are independent, so they run concurrently rather than
    // serialising the university lookup ahead of the rest.
    const [specificUniversity, topUniversities, recentFAQs, upcomingExams] = await Promise.all([
      findMentionedUniversity(promptText),
      University.find({
        $and: [
          PUBLISHED_UNIVERSITY,
          normalSegmentFilter(),
          // Only NIRF-ranked universities are candidates for "top". Without this,
          // an ascending sort on nirfRank returns the UNRANKED ones first (null
          // sorts before numbers), so the model was handed three arbitrary
          // universities and told they were the top three.
          { nirfRank: { $gt: 0 } },
        ],
      })
        .sort({ nirfRank: 1, 'stats.rating': -1 })
        .limit(3)
        .select('name state city stats description nirfRank slug'),
      FAQ.find({ isPublished: true }).sort({ order: 1 }).limit(3).select('question answer'),
      // Was Exam.find({}) — three arbitrary exams presented to the student as
      // "upcoming", including ones whose date has passed.
      Exam.find({ examDate: { $gte: new Date() } })
        .sort({ examDate: 1 })
        .limit(3)
        .select('name registrationDeadline examDate officialUrl'),
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
    // Was `error.message || ...`, which echoed raw driver/runtime text.
    return serverError(res, error, 'question.generateQuestionHelp');
  }
};


