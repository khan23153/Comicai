import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface MangaPanel {
  panel_number: number;
  image_prompt: string;
  narration_text: string;
  dialogue_text: string;
  thought_text: string;
  sfx_text: string;
  image_url?: string;
}

export interface MangaResponse {
  layout: string;
  panels: MangaPanel[];
  error?: string;
}

async function generateImageWithReplicate(prompt: string): Promise<string> {
  const replicateApiKey = process.env.REPLICATE_API_KEY;
  if (!replicateApiKey) {
    throw new Error("REPLICATE_API_KEY is not configured");
  }

  const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateApiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: {
        prompt: `manga style, black and white comic art, detailed line art, ${prompt}`,
        aspect_ratio: "1:1",
        num_outputs: 1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate API error: ${response.status} ${error}`);
  }

  const data = await response.json();

  if (data.status === "succeeded" && Array.isArray(data.output) && data.output.length > 0) {
    return data.output[0] as string;
  }

  // If not immediately succeeded, poll until done
  const predictionId = data.id as string;
  if (!predictionId) {
    throw new Error("No prediction ID returned from Replicate");
  }

  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const pollResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: { Authorization: `Bearer ${replicateApiKey}` },
      }
    );
    const pollData = await pollResponse.json();
    if (pollData.status === "succeeded" && Array.isArray(pollData.output) && pollData.output.length > 0) {
      return pollData.output[0] as string;
    }
    if (pollData.status === "failed") {
      throw new Error(`Image generation failed: ${String(pollData.error ?? "Unknown error")}`);
    }
  }

  throw new Error("Image generation timed out");
}

async function generateImageWithDalle(prompt: string): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: `manga style, black and white comic art, detailed line art, ${prompt}`,
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const url = data?.data?.[0]?.url as string | undefined;
  if (!url) {
    throw new Error("No image URL returned from OpenAI");
  }
  return url;
}

async function generateImage(prompt: string): Promise<string> {
  const imageProvider = process.env.IMAGE_PROVIDER ?? "replicate";
  if (imageProvider === "openai") {
    return generateImageWithDalle(prompt);
  }
  return generateImageWithReplicate(prompt);
}

function getPanelCount(layout: string): number {
  const counts: Record<string, number> = {
    "1x1": 1,
    "1x2": 2,
    "2x2": 4,
    "manga_strip": 4,
  };
  return counts[layout] ?? 4;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { scenario?: string; layout?: string };
    const { scenario, layout = "manga_strip" } = body;

    if (!scenario || scenario.trim().length === 0) {
      return NextResponse.json(
        { error: "Story scenario is required" },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Step 1: Use Gemini to structure the story into panels
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const panelCount = getPanelCount(layout);

    const systemPrompt = `You are a professional Manga Director and Storyboard Artist. 
Your task is to divide the given story scenario into exactly ${panelCount} manga panels.
For each panel, create:
1. A highly detailed "image_prompt" (50-100 words, optimized for AI image generation, ensuring visual consistency across all panels - same character descriptions, art style: manga, black and white, detailed line art)
2. "narration_text" - external story narration box text (1-2 sentences, or empty string)
3. "dialogue_text" - speech bubble text for characters (or empty string)
4. "thought_text" - thought bubble text (or empty string)  
5. "sfx_text" - sound effects text like "BANG!", "WHOOSH!", "KRA-BOOM!" (or empty string)

IMPORTANT: Return ONLY a valid JSON object with this exact structure, no markdown code blocks, no extra text:
{
  "panels": [
    {
      "panel_number": 1,
      "image_prompt": "detailed manga style scene description...",
      "narration_text": "The city never sleeps...",
      "dialogue_text": "Who are you?!",
      "thought_text": "",
      "sfx_text": ""
    }
  ]
}`;

    const result = await model.generateContent([
      systemPrompt,
      `Story scenario: ${scenario}`,
    ]);

    const responseText = result.response.text();

    // Parse Gemini JSON response
    let panelsData: { panels: MangaPanel[] };
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      panelsData = JSON.parse(cleanedResponse) as { panels: MangaPanel[] };
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "Failed to parse AI story structure. Please try again." },
          { status: 500 }
        );
      }
      panelsData = JSON.parse(jsonMatch[0]) as { panels: MangaPanel[] };
    }

    if (!panelsData.panels || panelsData.panels.length === 0) {
      return NextResponse.json(
        { error: "AI did not generate any panels. Please try again." },
        { status: 500 }
      );
    }

    // Step 2: Generate images simultaneously for all panels
    const imagePromises = panelsData.panels.map((panel) =>
      generateImage(panel.image_prompt).catch((err: unknown) => {
        console.error(`Failed to generate image for panel ${panel.panel_number}:`, err);
        return null; // Return null on failure so other panels aren't blocked
      })
    );

    const imageUrls = await Promise.all(imagePromises);

    // Step 3: Combine panels with image URLs
    const panels: MangaPanel[] = panelsData.panels.map((panel, index) => ({
      ...panel,
      image_url: imageUrls[index] ?? undefined,
    }));

    const response: MangaResponse = { layout, panels };
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error generating manga:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
