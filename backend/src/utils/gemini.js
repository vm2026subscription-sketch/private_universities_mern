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

exports.generateGeminiReply = async ({ prompt, category, context, mode = 'general' }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const systemInstruction = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const fullPrompt = `Category: ${category}\nContext: ${context}\nInstruction: Answer the student directly and do not add unrelated information.\nStudent Question: ${prompt}`;

  // Free-tier flash aliases get deprioritized (503) or rate-limited (429) under
  // load. Try the configured model first, then a lighter alias, retrying the
  // transient errors briefly. Only if EVERY attempt fails do we surface an error
  // (the caller then serves its keyword fallback). Kept fast to stay within the
  // caller's ~12s AI timeout.
  const primary = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const candidates = [...new Set([primary, 'gemini-flash-lite-latest'])];

  let lastError;
  for (const modelName of candidates) {
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent(fullPrompt);
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
};
