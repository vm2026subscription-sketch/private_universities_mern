const { translateText: geminiTranslate } = require('../utils/gemini');

// Translation endpoint used by the chatbot's EN/HI/MR language switcher.
// Bhashini API keys are not available for this project, so translation is
// powered by Gemini (which already backs the chatbot). The endpoint path and
// response shape are unchanged so the frontend needs no modification.
exports.translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ success: false, message: 'Text and targetLanguage are required' });
    }

    const translatedText = await geminiTranslate({ text, targetLanguage });
    res.json({ success: true, translatedText });
  } catch (error) {
    console.error('Translation Error:', error.message);
    res.status(500).json({ success: false, message: 'Translation failed' });
  }
};
