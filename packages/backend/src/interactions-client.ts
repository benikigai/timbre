import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY is not defined in environment variables.");
  process.exit(1);
}

// Instantiate the co-optimized GenAI client for Google Antigravity and Interactions API
export const ai = new GoogleGenAI({ apiKey });
