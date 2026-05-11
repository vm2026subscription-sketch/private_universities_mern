const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.generateGeminiReply = async ({ prompt, category, context }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      systemInstruction: 'You are Vidyarthi Mitra AI, a helpful education assistant specialized in Indian universities, admissions, exams (JEE, NEET, etc.), fees, placements, and scholarships. Provide concise, accurate, and helpful advice to students and parents.'
    });

    const fullPrompt = `Category: ${category}\nContext: ${context}\nStudent Question: ${prompt}`;
    
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

