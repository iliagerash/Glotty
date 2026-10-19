import { GoogleGenAI } from "@google/genai";
import type { JsonCompletionRequest, ModelProvider } from "./gateway";

export class GeminiProvider implements ModelProvider {
  readonly id = "gemini";
  private readonly client: GoogleGenAI;

  constructor(apiKey: string, readonly model: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async completeJson(req: JsonCompletionRequest): Promise<unknown> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: req.user,
      config: {
        systemInstruction: req.system,
        responseMimeType: "application/json",
        temperature: req.temperature ?? 0.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error(`Gemini model ${this.model} returned an empty response`);
    }
    return JSON.parse(text);
  }
}
