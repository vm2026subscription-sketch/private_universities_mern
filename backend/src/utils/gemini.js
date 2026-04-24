const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const extractText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || '').join('\n').trim();
};

exports.generateGeminiReply = async ({ prompt, category, context }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: [
                  'You are Vidyarthi Mitra AI, a concise Indian higher-education assistant.',
                  'Answer the student in helpful, practical language.',
                  'If information is uncertain, say so clearly and suggest what to verify.',
                  `Category: ${category || 'general'}`,
                  context ? `Context: ${context}` : '',
                  `Student question: ${prompt}`,
                ].filter(Boolean).join('\n'),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Gemini request failed');
  }

  const data = await response.json();
  const text = extractText(data);

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return text;
};
