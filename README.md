# MemeComicGen 🎨

AI-powered comic & meme generator built with Next.js (App Router), Fabric.js, Google Gemini, and Replicate.

## Features

- **AI scenario expansion** — describe a funny situation; Gemini turns it into vivid panel prompts
- **Image generation** — Replicate (Stable Diffusion) generates 1–4 comic-style panels
- **Drag-and-drop canvas editor** — powered by Fabric.js; drag, resize, and double-click to edit objects
- **Add text captions and speech bubbles** directly on the canvas
- **Download as PNG** — 2× high-resolution export with a "MemeComicGen" watermark

## Getting Started

### 1. Prerequisites

- Node.js ≥ 18
- A [Google AI Studio](https://aistudio.google.com/) API key
- A [Replicate](https://replicate.com/) API token

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

```env
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
REPLICATE_API_TOKEN=your_replicate_api_token_here

# Optional: override the Stable Diffusion model version used on Replicate
# REPLICATE_MODEL_VERSION=ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
npm start
```

## Project Structure

```
app/
  api/generate-meme/route.ts   # POST handler: Gemini prompt expansion + Replicate image gen
  layout.tsx                    # Root layout (dark mode)
  globals.css                   # Tailwind v4 base styles
  page.tsx                      # Main page UI
components/
  CanvasEditor.tsx              # Fabric.js canvas editor (SSR-safe)
next.config.ts                  # Image domain allowlist for Replicate
.env.local.example              # Environment variable template
```

## Usage

1. Type a funny scenario in the text box (up to 1000 characters)
2. Choose 1–4 panels and click **✨ Generate Meme**
3. Click any generated panel to add it to the canvas
4. Use the toolbar to add captions or speech bubbles (double-click to edit text)
5. Click **⬇ Download Meme** to export as a PNG

## Tech Stack

| Layer       | Technology                         |
|-------------|-------------------------------------|
| Framework   | Next.js 16 (App Router, TypeScript) |
| Styling     | Tailwind CSS v4                     |
| Canvas      | Fabric.js v7                        |
| HTTP client | Axios                               |
| AI (text)   | Google Gemini 1.5 Flash             |
| AI (images) | Replicate (Stable Diffusion v1.5)   |
