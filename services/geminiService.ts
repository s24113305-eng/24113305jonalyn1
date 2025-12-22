
import { GoogleGenAI, Type } from "@google/genai";
import { GameTheme } from "../types";

const themeSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "A creative name for the dartboard theme" },
    backgroundColor: { type: Type.STRING, description: "Hex color code for the background (wall behind board)" },
    targetColor: { type: Type.STRING, description: "Hex color for the main dartboard segments" },
    knifeHandleColor: { type: Type.STRING, description: "Hex color for the dart flights" },
    knifeBladeColor: { type: Type.STRING, description: "Hex color for the dart barrel/shaft" },
    accentColor: { type: Type.STRING, description: "Hex color for the dartboard wires and highlights" },
    description: { type: Type.STRING, description: "A short, witty description of the dartboard vibe" }
  },
  required: ["name", "backgroundColor", "targetColor", "knifeHandleColor", "knifeBladeColor", "accentColor", "description"]
};

/**
 * Generates a game theme using Gemini 3 Flash.
 * Instantiates the client locally to ensure the latest API key is used.
 */
export const generateGameTheme = async (prompt: string): Promise<GameTheme> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a visual color theme for a 'Dartboard and Dart' game based on the concept: "${prompt}". Focus on making the dartboard look interesting and high-contrast against the background. Return purely JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: themeSchema
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as GameTheme;
    }
    throw new Error("No text returned from Gemini");
    
  } catch (error) {
    console.error("Theme generation failed:", error);
    return {
      name: "Retro Pub",
      backgroundColor: "#1e1b4b",
      targetColor: "#0f172a",
      knifeHandleColor: "#f43f5e",
      knifeBladeColor: "#94a3b8",
      accentColor: "#22c55e",
      description: "Fallback classic pub style."
    };
  }
};

/**
 * Edits a snapshot using Gemini 2.5 Flash Image.
 * Instantiates the client locally to ensure the latest API key is used.
 */
export const editSnapshot = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const data = base64Image.split(',')[1] || base64Image;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: data, mimeType: 'image/png' } },
          { text: `Please edit this image based on the following instruction: ${prompt}. Return only the edited image.` },
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image editing failed:", error);
    return null;
  }
};

/**
 * Veo 3.1 Video Generation.
 * Follows strict guidelines for API key selection and client instantiation.
 */
export const animateImageWithVeo = async (
  base64Image: string, 
  prompt: string, 
  aspectRatio: '16:9' | '9:16' = '16:9',
  onProgress: (status: string) => void
): Promise<string | null> => {
  try {
    // Create fresh instance right before call as required for Veo/paid key models
    const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const data = base64Image.split(',')[1] || base64Image;

    onProgress("Initializing cinematic engine...");
    let operation = await veoAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || 'Animate this scene with subtle cinematic movement, high quality, neon lighting',
      image: {
        imageBytes: data,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    const statusMessages = [
      "Analyzing pixel trajectories...",
      "Synthesizing temporal consistency...",
      "Baking neon reflections...",
      "Optimizing fluid dynamics...",
      "Polishing final frames...",
      "Encoding high-fidelity stream..."
    ];
    let msgIdx = 0;

    while (!operation.done) {
      onProgress(statusMessages[msgIdx % statusMessages.length]);
      msgIdx++;
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await veoAi.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation yielded no results.");

    onProgress("Finalizing download...");
    // Must append API key when fetching from the download link as per guidelines
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error) {
    console.error("Veo generation failed:", error);
    throw error;
  }
};
