
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI((import.meta as any).env.VITE_GEMINI_API_KEY);

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export const refineDescription = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `請優化並專業化以下的資料申請描述。使其對資料管理團隊來說更為簡潔、清晰且正式。請直接返回優化後的繁體中文文本，不要有任何前言或引號： "${text}"`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Gemini 錯誤:", error);
    return text;
  }
};
