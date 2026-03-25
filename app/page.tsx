"use client";

import { useRef, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import type { CanvasEditorHandle } from "@/components/CanvasEditor";

// Dynamically import CanvasEditor to avoid SSR issues with fabric.js
const CanvasEditor = dynamic(() => import("@/components/CanvasEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-72 rounded-xl border border-gray-700 bg-gray-800 text-gray-400">
      Loading Canvas…
    </div>
  ),
});

export default function Home() {
  const [scenario, setScenario] = useState("");
  const [imageCount, setImageCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [bubbleText, setBubbleText] = useState("Ha!");
  const [customText, setCustomText] = useState("Add caption here");

  const canvasRef = useRef<CanvasEditorHandle>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!scenario.trim()) return;
    setLoading(true);
    setError(null);
    setImageUrls([]);

    try {
      const { data } = await axios.post("/api/generate-meme", {
        scenario: scenario.trim(),
        imageCount,
      });
      setImageUrls(data.imageUrls ?? []);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? err.message)
          : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleAddImageToCanvas(url: string) {
    canvasRef.current?.addImage(url);
  }

  function handleAddText() {
    canvasRef.current?.addText(customText);
  }

  function handleAddBubble() {
    canvasRef.current?.addSpeechBubble(bubbleText);
  }

  function handleExport() {
    const dataURL = canvasRef.current?.exportPNG();
    if (!dataURL) return;
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "meme.png";
    link.click();
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          🎨 MemeComicGen
        </h1>
        <p className="mt-2 text-gray-400 text-sm">
          AI-powered comic &amp; meme generator — describe a scenario, get
          instant panels!
        </p>
      </header>

      {/* Generate Form */}
      <section className="max-w-2xl mx-auto mb-8">
        <form
          onSubmit={handleGenerate}
          className="bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-800 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-300 mb-1 block">
              Your Funny Scenario
            </span>
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              rows={3}
              placeholder="e.g. Desi mom scolding son holding a flying chappal"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </label>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-300 shrink-0">
              Number of panels:
            </label>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setImageCount(n)}
                className={`w-9 h-9 rounded-full text-sm font-bold transition-colors ${
                  imageCount === n
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !scenario.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating…
              </>
            ) : (
              "✨ Generate Meme"
            )}
          </button>

          {error && (
            <p className="text-red-400 text-sm text-center">⚠️ {error}</p>
          )}
        </form>
      </section>

      {/* Generated Image Panels */}
      {imageUrls.length > 0 && (
        <section className="max-w-4xl mx-auto mb-8">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            🖼️ Generated Panels — click to add to canvas
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {imageUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => handleAddImageToCanvas(url)}
                className="group relative rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Panel ${i + 1}`}
                  className="w-full h-48 object-cover"
                  crossOrigin="anonymous"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold">
                  + Add to Canvas
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Canvas + Toolbar */}
      <section className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Toolbar */}
          <aside className="lg:w-56 shrink-0 bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-4 self-start">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Toolbar
            </h2>

            {/* Add Text */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Caption text</label>
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleAddText}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors"
              >
                + Add Text
              </button>
            </div>

            {/* Add Speech Bubble */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Speech bubble text</label>
              <input
                value={bubbleText}
                onChange={(e) => setBubbleText(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleAddBubble}
                className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-semibold transition-colors"
              >
                💬 Add Speech Bubble
              </button>
            </div>

            <hr className="border-gray-700" />

            {/* Export */}
            <button
              onClick={handleExport}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-sm font-bold transition-opacity"
            >
              ⬇ Download Meme
            </button>
          </aside>

          {/* Canvas */}
          <div className="flex-1">
            <CanvasEditor ref={canvasRef} width={760} height={560} />
          </div>
        </div>
      </section>
    </main>
  );
}
