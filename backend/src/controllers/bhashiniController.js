const { translateText: geminiTranslate, translateBatch: geminiTranslateBatch } = require('../utils/gemini');

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

// Batch translation — translates an array of texts in one call so the chatbot
// can translate the whole conversation quickly instead of message-by-message.
exports.translateBatch = async (req, res) => {
  try {
    const { texts, targetLanguage } = req.body;

    if (!Array.isArray(texts) || !targetLanguage) {
      return res.status(400).json({ success: false, message: 'texts (array) and targetLanguage are required' });
    }

    const translations = await geminiTranslateBatch({ texts, targetLanguage });
    res.json({ success: true, translations });
  } catch (error) {
    console.error('Batch Translation Error:', error.message);
    res.status(500).json({ success: false, message: 'Translation failed' });
  }
};
