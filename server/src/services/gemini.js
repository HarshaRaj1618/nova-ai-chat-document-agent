import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
export const ai = apiKey ? new GoogleGenAI({apiKey}) : null;
export const configuredModel = model;

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function generate(prompt, config = {}) {
  if (!ai) throw Object.assign(new Error('GEMINI_API_KEY is missing. Add it to server/.env.'), {status:503});
  let lastError;
  for (let attempt=0; attempt<4; attempt++) {
    try {
      return await ai.models.generateContent({ model, contents:prompt, config });
    } catch (error) {
      lastError = error;
      const status = error?.status;
      if (status !== 429 && status !== 503) throw error;
      if (attempt < 3) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError;
}
