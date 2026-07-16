"use server";

import { AI_Models } from "@/models/nvidia/provider";

export async function askModel(modelKey: string, content: string, temperature?: number) {
  try {
    const modelFn = AI_Models[modelKey as keyof typeof AI_Models];
    if (!modelFn) {
      throw new Error(`Model ${modelKey} not found`);
    }
    const result = await modelFn(content, { temperature });
    return { success: true, answer: result };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "An error occurred";
    return { success: false, error: errMsg };
  }
}
