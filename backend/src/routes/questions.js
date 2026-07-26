const router = require('express').Router();
const { getQuestions, getQuestion, createQuestion, postAnswer, upvoteQuestion, upvoteAnswer, markBestAnswer, generateQuestionHelp } = require('../controllers/questionController');
const { protect } = require('../middleware/auth');
const { aiAssistLimiter } = require('../middleware/rateLimiters');
router.route('/').get(getQuestions).post(protect, createQuestion);
// Public and unauthenticated, but every call spends a Gemini request from a quota
// measured in tens per day on the free tier — so it gets its own per-IP budget.
router.post('/assist', aiAssistLimiter, generateQuestionHelp);
router.get('/:id', getQuestion);
router.post('/:id/answers', protect, postAnswer);
router.put('/:id/upvote', protect, upvoteQuestion);
router.put('/:questionId/answers/:answerId/upvote', protect, upvoteAnswer);
router.post('/:questionId/answers/:answerId/helpful', protect, upvoteAnswer);
router.put('/:questionId/answers/:answerId/best', protect, markBestAnswer);
module.exports = router;
