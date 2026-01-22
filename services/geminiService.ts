import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. 初始化 AI 客戶端
const genAI = new GoogleGenerativeAI((import.meta as any).env.VITE_GEMINI_API_KEY || '');

// 2. 取得模型 (建議使用穩定的 gemini-1.5-flash)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const refineDescription = async (text: string): Promise<string> => {
  try {
    // 使用正確的 generateContent 方法
    const result = await model.generateContent(`請優化並專業化以下資料申請描述。使其對資料管理團隊來說更為簡潔、清晰且正式。請直接返回優化後的繁體中文文本，不要有任何前言或引號： "${text}"`);
    const response = await result.response;
    return response.text() || text;
  } catch (error) {
    console.error("Gemini 錯誤:", error);
    return text;
  }
};
