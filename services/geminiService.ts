
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Sale, Product, Customer, Currency } from "../types";

// Helper for decoding audio (used for TTS)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Guidelines: Always use `const ai = new GoogleGenAI({apiKey: process.env.API_KEY});`
 * Note: process.env.API_KEY is defined globally by vite.config.ts
 */

export const getSmartInsights = async (sales: Sale[], products: Product[], customers: Customer[], currency: Currency) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const salesSummary = sales.map(s => ({
    date: new Date(s.date).toLocaleDateString(),
    product: products.find(p => p.id === s.productId)?.name,
    customer: customers.find(c => c.id === s.customerId)?.name,
    amount: `${currency.symbol}${s.totalAmount}`,
    status: s.paymentStatus,
    qty: s.quantity
  }));

  const prompt = `
    As a premium farm management consultant, analyze the following recent sales data.
    All figures are in ${currency.name} (${currency.code}, Symbol: ${currency.symbol}).
    Data: ${JSON.stringify(salesSummary.slice(0, 50))}
    
    Provide a high-impact, professional analysis for the farmer.
    Structure the response with:
    1. Executive Summary: A quick overview of business health.
    2. Strategic Growth Opportunities: Based on product velocity.
    3. Risk Mitigation: Specifically addressing cash flow from "Pending" payments.
    4. Operational Excellence: A "Golden Tip" for the coming week.
    
    Use a motivating, sophisticated tone. Format with clear headings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate insights at this time. Ensure you have a stable connection.";
  }
};

export const getMarketPrices = async (cropName: string, location: string = "Global") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = `What are the current market wholesale prices for ${cropName} in ${location}? Provide a concise summary and mention specific sources.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Source",
      uri: chunk.web?.uri
    })).filter((s: any) => s.uri) || [];

    return {
      text: response.text,
      sources
    };
  } catch (error) {
    console.error("Market Grounding Error:", error);
    return { text: "Market data unavailable.", sources: [] };
  }
};

export const speakInsight = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this farm insight professionally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
      return true;
    }
    return false;
  } catch (error) {
    console.error("TTS Error:", error);
    return false;
  }
};

export const generateProductImage = async (productName: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High-end commercial food photography of ${productName}. Fresh, raw, farm-to-table aesthetic. Soft natural window lighting, neutral rustic background, ultra-high resolution 4k, macro lens focus on textures, vibrant organic colors.` }],
      },
      config: {
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};
