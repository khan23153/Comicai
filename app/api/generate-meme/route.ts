import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a creative comic/meme image prompt engineer.
Given a funny scenario, produce a JSON array of 1 to 4 highly detailed, 
visual image-generation prompts. Each prompt must be a single string that 
is vivid, includes lighting, setting, character description, and comic-art 
style cues. Respond ONLY with a valid JSON array of strings.
Example output:
["Detailed prompt 1 here", "Detailed prompt 2 here"]`;

// Replicate model version for image generation (Stable Diffusion v1.5)
// Override via REPLICATE_MODEL_VERSION env var if needed.
// See: https://replicate.com/stability-ai/stable-diffusion
const REPLICATE_MODEL_VERSION =
  process.env.REPLICATE_MODEL_VERSION ??
  "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4";

async function generateImageWithReplicate(prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

  // Start the prediction
  const startRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: REPLICATE_MODEL_VERSION,
      input: {
        prompt,
        width: 512,
        height: 512,
        num_outputs: 1,
        num_inference_steps: 20,
        guidance_scale: 7.5,
        scheduler: "DPMSolverMultistep",
      },
    }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Replicate prediction failed: ${err}`);
  }

  const prediction = await startRes.json();
  const pollUrl = prediction.urls?.get;
  if (!pollUrl) throw new Error("No poll URL returned from Replicate");

  // Poll until complete (up to 2 minutes)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await pollRes.json();
    if (data.status === "succeeded" && data.output?.length > 0) {
      return data.output[0] as string;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate prediction ${data.status}: ${data.error}`);
    }
  }
  throw new Error("Replicate prediction timed out");
}

export async function POST(request: NextRequest) {
  try {
    // Validate required environment variables at request time
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const { scenario, imageCount } = await request.json();

    if (!scenario || typeof scenario !== "string" || scenario.trim() === "") {
      return NextResponse.json(
        { error: "scenario is required" },
        { status: 400 }
      );
    }

    const count = Math.min(Math.max(Number(imageCount) || 2, 1), 4);

    // Step 1: Use Gemini to expand the scenario into detailed prompts
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const geminiResult = await model.generateContent(
      `${SYSTEM_PROMPT}\n\nScenario: ${scenario}\n\nGenerate exactly ${count} panel prompt(s).`
    );
    const geminiText = geminiResult.response.text().trim();

    let detailedPrompts: string[];
    try {
      const jsonMatch = geminiText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found in Gemini response");
      detailedPrompts = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(detailedPrompts))
        throw new Error("Parsed value is not an array");
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Gemini response", raw: geminiText },
        { status: 500 }
      );
    }

    // Trim to requested count
    detailedPrompts = detailedPrompts.slice(0, count);

    // Step 2: Generate images in parallel
    const imageUrls = await Promise.all(
      detailedPrompts.map((prompt) => generateImageWithReplicate(prompt))
    );

    return NextResponse.json({ imageUrls, detailedPrompts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}
