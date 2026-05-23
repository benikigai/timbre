import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY is not defined in your environment or .env file.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function run() {
  console.log("Connecting to Gemini API...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Hello, this is a connection check for our hackathon project, Timbre. Say "Connection Successful!" if you receive this.',
    });
    console.log("\nGemini Response:");
    console.log(response.text);
  } catch (error) {
    console.error("API Connection Failed:", error);
  }
}

run();
