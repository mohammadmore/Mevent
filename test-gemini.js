import { GoogleGenAI, Type } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const aiResponse = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: "لیست نمایشگاه‌های امسال",
  });
  console.log(aiResponse.text);
}
run();
