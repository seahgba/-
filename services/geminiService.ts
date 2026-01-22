import { GoogleGenerativeAI } from "@google/generative-ai";

// 修正初始化語法，統一使用 genAI 變數
const genAI = new GoogleGenerativeAI((import.meta as any).env.VITE_GEMINI_API_KEY || '');

export const refineDescription = async (text: string): Promise<string> => {
  try {
    // 使用正確的 model 名稱和 generateContent 語法
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`請優化以下資料申請描述，使其專業且簡潔。直接返回繁體中文文本： "${text}"`);
    const response = await result.response;
    return response.text() || text;
  } catch (error) {
    console.error("Gemini 錯誤:", error);
    return text;
  }
};
