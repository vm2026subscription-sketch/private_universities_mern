const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPTS = {
  general: 'You are Vidyarthi Mitra AI, a helpful education assistant specialized in Indian universities, admissions, exams (JEE, NEET, etc.), fees, placements, and scholarships. Give a direct answer first. If important details are missing, state your best practical guidance in 2-4 sentences and then ask only the minimum follow-up details needed.',

  expert: `You are VidyarthiMitra AI, an expert education counselor specializing in Indian and international higher education.

Your primary responsibility is helping students make the best decisions regarding:
- Universities, Colleges, Courses, Degrees, Specializations
- Entrance Exams, Admissions, Scholarships
- Placements, Career Opportunities
- Study Abroad, Twinning Programs, Foreign Universities in India
- Fee Comparison, ROI Analysis, Eligibility Requirements, Application Deadlines

When recommending a university or course:
1. Ask for student profile details if missing (marks, rank, budget, preferred location).
2. Consider budget constraints carefully.
3. Consider academic background and eligibility.
4. Consider career goals and long-term outcomes.
5. Compare multiple options with clear pros and cons.
6. Explain advantages and disadvantages of each option.
7. Suggest best-fit universities based on the student profile.
8. Recommend scholarships when available.
9. Prioritize student outcomes, placement records, and return on investment.
10. Provide personalized recommendations rather than generic answers.

Always guide the student toward the most suitable option based on their profile. Be specific, data-driven, and empathetic.`
};

// Transient statuses that are worth retrying / falling back on: 503 (model
// overloaded), 429 (rate/quota spike), 500 (server error). A 404 (model not
// available to this key) is NOT retryable — we skip straight to the next model.
const RETRYABLE = new Set([429, 500, 503]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const statusOf = (error) => {
  if (error && typeof error.status === 'number') return error.status;
  const m = error && error.message && error.message.match(/\[(\d{3})/);
  return m ? Number(m[1]) : 0;
};

// Core Gemini call with the free-tier resilience: try the configured model
// first, then a lighter alias, retrying transient 503/429/500 errors briefly.
// Only if EVERY attempt fails does it throw (callers then serve their fallback).
// Kept fast to stay within callers' ~12s timeout.
async function runGemini(systemInstruction, userPrompt) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // On the free tier gemini-flash-latest (currently -> gemini-3.5-flash) is
  // capped at ~20 requests/day and returns 503/429 almost immediately, whereas
  // gemini-flash-lite-latest has a much higher free quota. So default to the
  // lite alias, and always keep both in the fallback chain regardless of which
  // one GEMINI_MODEL selects.
  const primary = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const candidates = [...new Set([primary, 'gemini-flash-lite-latest', 'gemini-flash-latest'])];

  let lastError;
  for (const modelName of candidates) {
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent(userPrompt);
        const text = (await result.response).text();
        if (!text) throw new Error('Empty response from AI');
        return text;
      } catch (error) {
        lastError = error;
        const status = statusOf(error);
        console.error(`Gemini error (model=${modelName}, attempt=${attempt + 1}, status=${status}):`, error.message);
        // Non-retryable (e.g. 404 model missing, 400 bad key) → try next model now.
        if (!RETRYABLE.has(status)) break;
        // Retryable → short backoff before the next attempt.
        if (attempt === 0) await sleep(600);
      }
    }
  }

  throw new Error(lastError?.message || 'AI Assistant is currently unavailable');
}

exports.generateGeminiReply = async ({ prompt, category, context, mode = 'general' }) => {
  const systemInstruction = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general;
  const fullPrompt = `Category: ${category}\nContext: ${context}\nInstruction: Answer the student directly and do not add unrelated information.\nStudent Question: ${prompt}`;
  return runGemini(systemInstruction, fullPrompt);
};

// Human-readable names for the language codes the chat UI sends. Extend this map
// to offer more languages in the widget's language switcher.
const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  gu: 'Gujarati',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  bn: 'Bengali',
  pa: 'Punjabi',
};

exports.getSupportedLanguages = () => ({ ...LANGUAGE_NAMES });

// Translate text into the target language using Gemini. Returns the input
// unchanged when the target is English or unknown. Preserves formatting and
// leaves proper nouns / URLs / numbers intact.
exports.translateText = async ({ text, targetLanguage }) => {
  const clean = String(text || '').trim();
  if (!clean) return '';

  const langName = LANGUAGE_NAMES[targetLanguage];
  if (!langName || targetLanguage === 'en') return clean;

  const systemInstruction =
    `You are a professional translator. Translate the user's text into ${langName}. ` +
    'Output ONLY the translated text with no preamble, quotes, or notes. ' +
    'Preserve line breaks and formatting. Keep proper nouns, university names, ' +
    'URLs, email addresses, and numbers unchanged.';

  const translated = await runGemini(systemInstruction, clean);
  return translated.trim();
};
