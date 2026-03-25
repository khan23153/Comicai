"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { MangaPanel } from "@/app/api/generate-manga/route";
import type { MangaCanvasHandle } from "@/components/MangaCanvas";

const MangaCanvas = dynamic(() => import("@/components/MangaCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-64 bg-gray-900 rounded-lg">
      <p className="text-gray-400">Loading canvas editor...</p>
    </div>
  ),
});

type Layout = "1x1" | "1x2" | "2x2" | "manga_strip";

const LAYOUT_OPTIONS: { value: Layout; label: string; description: string }[] = [
  { value: "1x1", label: "1×1", description: "Single panel" },
  { value: "1x2", label: "1×2", description: "Two panels stacked" },
  { value: "2x2", label: "2×2", description: "Four panel grid" },
  { value: "manga_strip", label: "Manga Strip", description: "Sequential story strip" },
];

const EXAMPLE_SCENARIOS = [
  "A cyberpunk detective finds a glowing artifact in an alleyway. Suddenly, a ninja attacks him from the shadows.",
  "A young sorceress discovers an ancient spellbook in a ruined library. The book begins to speak, warning her of a great darkness.",
  "Two rival samurai meet at a misty bridge at dawn. After a moment of silence, they draw their swords and clash.",
  "An astronaut on a distant moon discovers strange alien footprints. Something watches from behind the craters.",
];

export default function Home() {
  const [scenario, setScenario] = useState("");
  const [layout, setLayout] = useState<Layout>("manga_strip");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panels, setPanels] = useState<MangaPanel[] | null>(null);
  const [generatedLayout, setGeneratedLayout] = useState<string>("manga_strip");
  const canvasRef = useRef<MangaCanvasHandle>(null);

  const handleGenerate = async () => {
    if (!scenario.trim()) {
      setError("Please enter a story scenario first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPanels(null);

    try {
      const response = await fetch("/api/generate-manga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.trim(), layout }),
      });

      const data = await response.json() as { panels?: MangaPanel[]; layout?: string; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to generate manga");
      }

      setPanels(data.panels ?? []);
      setGeneratedLayout(data.layout ?? layout);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setScenario(example);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-3xl">🎌</span>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Manga Create Using AI
            </h1>
            <p className="text-sm text-gray-400">
              Transform your story into manga panels
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Panel: Input */}
          <div className="space-y-6">
            {/* Story Input */}
            <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>📖</span> Your Story
              </h2>

              <textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Describe your manga story scene... (e.g., A samurai faces a dragon on a misty mountain peak. Lightning crackles overhead as the battle begins.)"
                className="w-full h-40 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                disabled={isLoading}
              />

              <p className="text-xs text-gray-500 mt-2">
                {scenario.length} characters · Be descriptive for better results
              </p>

              {/* Example Scenarios */}
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">
                  💡 Try an example:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {EXAMPLE_SCENARIOS.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(example)}
                      className="text-left text-sm text-gray-400 hover:text-purple-300 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/50 rounded-lg px-3 py-2 transition-all truncate"
                      disabled={isLoading}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Layout Selector */}
            <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>⚡</span> Layout
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {LAYOUT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLayout(option.value)}
                    disabled={isLoading}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      layout === option.value
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                    }`}
                  >
                    <div className="font-bold text-lg">{option.label}</div>
                    <div className="text-xs mt-0.5 opacity-70">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading || !scenario.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-200 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Generating Manga...</span>
                </>
              ) : (
                <>
                  <span>🎨</span>
                  <span>Generate Manga</span>
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm flex items-start gap-2">
                <span className="text-red-400 shrink-0">⚠</span>
                <p>{error}</p>
              </div>
            )}

            {/* Loading state description */}
            {isLoading && (
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4 space-y-2">
                <p className="text-purple-300 text-sm font-medium">
                  AI is creating your manga...
                </p>
                <div className="space-y-1 text-xs text-purple-400/70">
                  <p>✦ Structuring your story into panels</p>
                  <p>✦ Generating image prompts for each scene</p>
                  <p>✦ Creating AI images for all panels</p>
                  <p>✦ Composing your manga canvas</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Canvas */}
          <div className="space-y-4">
            {panels && panels.length > 0 ? (
              <>
                {/* Toolbar */}
                <section className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                    Canvas Toolbar
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <ToolbarButton
                      onClick={() => canvasRef.current?.addSpeechBubble()}
                      icon="💬"
                      label="Speech Bubble"
                    />
                    <ToolbarButton
                      onClick={() => canvasRef.current?.addThoughtBubble()}
                      icon="💭"
                      label="Thought Bubble"
                    />
                    <ToolbarButton
                      onClick={() => canvasRef.current?.addNarrationBox()}
                      icon="📝"
                      label="Narration Box"
                    />
                    <ToolbarButton
                      onClick={() => canvasRef.current?.deleteSelected()}
                      icon="🗑"
                      label="Delete Selected"
                      variant="danger"
                    />
                    <button
                      onClick={() => canvasRef.current?.downloadCanvas()}
                      className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg text-sm transition-all shadow-lg hover:shadow-green-500/25"
                    >
                      <span>⬇</span> Download Manga
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Tip: Double-click on text to edit it. Drag to reposition. Use toolbar to add/remove elements.
                  </p>
                </section>

                {/* Canvas */}
                <section className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                  <MangaCanvas
                    ref={canvasRef}
                    panels={panels}
                    layout={generatedLayout}
                  />
                </section>

                {/* Panel info */}
                <section className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                    Generated Panels ({panels.length})
                  </h3>
                  <div className="space-y-3">
                    {panels.map((panel, i) => (
                      <div
                        key={i}
                        className="bg-gray-800 rounded-xl p-3 border border-gray-700"
                      >
                        <p className="text-xs font-bold text-purple-400 mb-1">
                          Panel {panel.panel_number}
                        </p>
                        {panel.narration_text && (
                          <p className="text-xs text-yellow-300">
                            📖 {panel.narration_text}
                          </p>
                        )}
                        {panel.dialogue_text && (
                          <p className="text-xs text-white">
                            💬 &quot;{panel.dialogue_text}&quot;
                          </p>
                        )}
                        {panel.thought_text && (
                          <p className="text-xs text-blue-300">
                            💭 {panel.thought_text}
                          </p>
                        )}
                        {panel.sfx_text && (
                          <p className="text-xs text-red-400 font-bold">
                            ⚡ {panel.sfx_text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 border-dashed p-12 flex flex-col items-center justify-center text-center h-full min-h-96">
                <div className="text-6xl mb-4">🎌</div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  Your Manga Canvas
                </h3>
                <p className="text-gray-500 text-sm max-w-64">
                  Enter your story scenario on the left and click{" "}
                  <span className="text-purple-400 font-medium">
                    Generate Manga
                  </span>{" "}
                  to create your comic!
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs text-xs text-gray-600">
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <p className="text-xl mb-1">🤖</p>
                    <p>AI story direction</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <p className="text-xl mb-1">🖼</p>
                    <p>AI image generation</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <p className="text-xl mb-1">✏️</p>
                    <p>Editable text bubbles</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <p className="text-xl mb-1">📥</p>
                    <p>High-quality export</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-sm text-gray-600">
        <p>Manga Create Using AI · Powered by Google Gemini &amp; AI Image Generation</p>
      </footer>
    </main>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  icon: string;
  label: string;
  variant?: "default" | "danger";
}

function ToolbarButton({
  onClick,
  icon,
  label,
  variant = "default",
}: ToolbarButtonProps) {
  const styles =
    variant === "danger"
      ? "bg-red-900/30 hover:bg-red-900/50 border-red-700/50 hover:border-red-600 text-red-300"
      : "bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${styles}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
