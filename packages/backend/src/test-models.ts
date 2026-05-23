import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function test() {
  try {
    console.log('Testing gemini-2.5-flash-preview-tts with AUDIO modality...');
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: 'Hello world. This is a voice test.',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck' // standard Gemini voices: Puck, Charon, Kore, Fenrir, Aoede
            }
          }
        }
      }
    });
    console.log('gemini-2.5-flash-preview-tts: SUCCESS');
    // Check if there is audio in candidates
    const part = res.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      console.log('Audio bytes received!', part.inlineData.mimeType, part.inlineData.data.substring(0, 100) + '...');
    } else {
      console.log('No audio bytes received in part:', JSON.stringify(part));
    }
  } catch (err: any) {
    console.error('gemini-2.5-flash-preview-tts: FAILED', err.message || err);
  }

  try {
    console.log('Testing gemini-3-pro-image-preview...');
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: 'Hello world',
    });
    console.log('gemini-3-pro-image-preview: SUCCESS', res.text);
  } catch (err: any) {
    console.error('gemini-3-pro-image-preview: FAILED', err.message || err);
  }
}

test();
