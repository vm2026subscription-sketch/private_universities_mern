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

exports.generateGeminiReply = async ({ prompt, category, context, mode = 'general' }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const systemInstruction = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-1.5-flash — stable model compatible with current SDK versions.
    // Avoid gemini-1.5-flash-latest / gemini-2.0-flash which 404 on v1beta.
    const modelName = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').replace(/-latest$/, '');
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction
    });

    const fullPrompt = `Category: ${category}\nContext: ${context}\nInstruction: Answer the student directly and do not add unrelated information.\nStudent Question: ${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Empty response from AI');
    }

    return text;
  } catch (error) {
    console.error('Gemini SDK Error:', error);
    throw new Error(error.message || 'AI Assistant is currently unavailable');
  }
};
