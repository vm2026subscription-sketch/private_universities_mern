const axios = require('axios');

exports.translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    
    if (!text || !targetLanguage) {
      return res.status(400).json({ success: false, message: 'Text and targetLanguage are required' });
    }

    const apiKey = process.env.BHASHINI_API_KEY;
    const userId = process.env.BHASHINI_USER_ID;

    // If no credentials, return mock translation for demo purposes
    if (!apiKey || apiKey === 'your_bhashini_api_key') {
      return res.json({ 
        success: true, 
        translatedText: `[Bhashini Demo - ${targetLanguage}] ${text}`,
        isMock: true
      });
    }

    // Bhashini API implementation
    // 1. Get Pipeline
    const pipelineRes = await axios.post('https://meity-auth.ulcacontrib.org/ulca/apis/v1/service/list', {
      task: "translation"
    }, {
      headers: { 'Content-Type': 'application/json', 'ulca-api-key': apiKey }
    });

    const pipeline = pipelineRes.data?.services?.find(s => s.taskType === "translation");
    if (!pipeline) throw new Error('Translation pipeline not found');

    // 2. Compute Call
    const computeRes = await axios.post('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
      pipelineTasks: [{
        taskType: "translation",
        config: {
          language: {
            sourceLanguage: "en",
            targetLanguage: targetLanguage
          }
        }
      }],
      inputData: {
        input: [{ source: text }]
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'userID': userId
      }
    });

    const translatedText = computeRes.data?.pipelineResponse?.[0]?.output?.[0]?.target;
    
    res.json({ success: true, translatedText });
  } catch (error) {
    console.error('Bhashini Translation Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Translation failed' });
  }
};
