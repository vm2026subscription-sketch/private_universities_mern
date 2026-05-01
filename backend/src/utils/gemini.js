exports.generateGeminiReply = async ({ prompt, category, context }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Every combination of version and model to try
  const configs = [
    { version: 'v1beta', model: 'gemini-1.5-flash' },
    { version: 'v1', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-pro' },
    { version: 'v1', model: 'gemini-pro' },
    { version: 'v1beta', model: 'gemini-1.5-pro' }
  ];

  let lastError = null;

  for (const config of configs) {
    try {
      console.log(`Trying Gemini [${config.version}] with model: ${config.model}...`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `You are a helpful education assistant. Student question: ${prompt}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`✅ SUCCESS! Using ${config.version} - ${config.model}`);
          return text;
        }
      } else {
        console.warn(`❌ Failed ${config.version}/${config.model}: ${data.error?.message || 'Not Found'}`);
        lastError = new Error(data.error?.message || 'AI error');
        if (response.status === 404) continue; // Keep trying other configs
        else break; // Fatal error (e.g. invalid key)
      }
    } catch (error) {
      console.error(`Fetch Error:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error('AI Assistant is currently unavailable');
};
