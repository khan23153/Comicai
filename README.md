# Manga Create Using AI

A web platform that transforms your story scripts into manga comic strips using AI.

## Features

- 🎌 **AI Story Direction** — Google Gemini structures your story into 1–4 manga panels with dialogue, narration, thought bubbles, and SFX
- 🖼 **AI Image Generation** — Replicate (Flux) or OpenAI DALL-E 3 generates manga-style images for each panel
- ✏️ **Interactive Canvas Editor** — Fabric.js canvas with draggable, resizable, and editable speech/thought bubbles and narration boxes
- 📥 **High-Quality Export** — Download your manga as a JPEG with a watermark

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS (dark-mode)
- **Canvas**: Fabric.js
- **AI (Story)**: Google Gemini API
- **AI (Images)**: Replicate (Flux Schnell) or OpenAI DALL-E 3

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your API keys:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key — [get one here](https://makersuite.google.com/app/apikey) |
| `IMAGE_PROVIDER` | `replicate` (default) or `openai` |
| `REPLICATE_API_KEY` | Replicate API token — [get one here](https://replicate.com/account/api-tokens) |
| `OPENAI_API_KEY` | OpenAI API key (if using DALL-E 3) — [get one here](https://platform.openai.com/api-keys) |

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter your story scenario in the text area (e.g., *"A cyberpunk detective finds a glowing artifact in an alleyway. Suddenly, a ninja attacks him from the shadows."*)
2. Select a layout: 1×1, 1×2, 2×2, or Manga Strip
3. Click **Generate Manga**
4. Edit text bubbles, add new speech/thought bubbles or narration boxes on the canvas
5. Click **Download Manga** to export as JPEG

## API Route

`POST /api/generate-manga`

**Request body:**
```json
{
  "scenario": "Your story description here",
  "layout": "manga_strip"
}
```

**Response:**
```json
{
  "layout": "manga_strip",
  "panels": [
    {
      "panel_number": 1,
      "image_prompt": "...",
      "narration_text": "...",
      "dialogue_text": "...",
      "thought_text": "...",
      "sfx_text": "...",
      "image_url": "https://..."
    }
  ]
}
```

