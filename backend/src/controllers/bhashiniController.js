const { translateText: geminiTranslate, translateBatch: geminiTranslateBatch } = require('../utils/gemini');
const { fail } = require('../utils/apiResponse');

// Translation endpoint used by the chatbot's EN/HI/MR language switcher.
// Bhashini API keys are not available for this project, so translation is
// powered by Gemini (which already backs the chatbot). The endpoint path and
// response shape are unchanged so the frontend needs no modification.
exports.translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return fail(res, 400, 'Text and targetLanguage are required');
    }

    const translatedText = await geminiTranslate({ text, targetLanguage });
    res.json({ success: true, translatedText });
  } catch (error) {
    console.error('Translation Error:', error.message);
    fail(res, 500, 'Translation failed');
  }
};

// Batch translation — translates an array of texts in one call so the chatbot
// can translate the whole conversation quickly instead of message-by-message.
exports.translateBatch = async (req, res) => {
  try {
    const { texts, targetLanguage } = req.body;

    if (!Array.isArray(texts) || !targetLanguage) {
      return fail(res, 400, 'texts (array) and targetLanguage are required');
    }

    const translations = await geminiTranslateBatch({ texts, targetLanguage });
    res.json({ success: true, translations });
  } catch (error) {
    console.error('Batch Translation Error:', error.message);
    fail(res, 500, 'Translation failed');
  }
};
