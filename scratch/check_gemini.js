const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config({ path: "./backend/.env" });

async function listModels() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing");
    return;
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // There isn't a direct listModels in the SDK easily accessible without an authenticated client
    // But we can try a simple request to 'gemini-pro' to see if it works
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("test");
    console.log("Gemini Pro works!");
  } catch (e) {
    console.error("Gemini Pro Error:", e.message);
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("Gemini 1.5 Flash works!");
  } catch (e) {
    console.error("Gemini 1.5 Flash Error:", e.message);
  }
}

listModels();
