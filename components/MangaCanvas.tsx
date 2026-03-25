"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import type { MangaPanel } from "@/app/api/generate-manga/route";

export interface MangaCanvasHandle {
  downloadCanvas: () => void;
  addSpeechBubble: () => void;
  addThoughtBubble: () => void;
  addNarrationBox: () => void;
  deleteSelected: () => void;
}

interface MangaCanvasProps {
  panels: MangaPanel[];
  layout: string;
}

interface FabricCanvas {
  dispose: () => void;
  renderAll: () => void;
  add: (...objects: unknown[]) => FabricCanvas;
  remove: (...objects: unknown[]) => FabricCanvas;
  getActiveObject: () => FabricObject | null;
  getActiveObjects: () => FabricObject[];
  toDataURL: (options?: { format?: string; quality?: number; multiplier?: number }) => string;
  setWidth: (value: number) => void;
  setHeight: (value: number) => void;
  width: number;
  height: number;
  discardActiveObject: () => void;
  requestRenderAll: () => void;
}

interface FabricObject {
  set: (options: Record<string, unknown>) => FabricObject;
  on: (event: string, handler: () => void) => void;
}

interface FabricTextbox extends FabricObject {
  text: string;
}

interface FabricLib {
  Canvas: new (el: HTMLCanvasElement, options?: Record<string, unknown>) => FabricCanvas;
  FabricImage: {
    fromURL: (
      url: string,
      options?: Record<string, unknown>
    ) => Promise<FabricObject>;
  };
  Textbox: new (text: string, options?: Record<string, unknown>) => FabricTextbox;
  Rect: new (options?: Record<string, unknown>) => FabricObject;
  Ellipse: new (options?: Record<string, unknown>) => FabricObject;
  Group: new (objects: FabricObject[], options?: Record<string, unknown>) => FabricObject;
  util: {
    enlivenObjects: (objects: unknown[], callback: (objects: FabricObject[]) => void) => void;
  };
}

const PANEL_WIDTH = 500;
const PANEL_GAP = 10;
const PANEL_BORDER = 4;

function getPanelLayout(layout: string, panelCount: number): { cols: number; rows: number } {
  if (layout === "1x1") return { cols: 1, rows: 1 };
  if (layout === "1x2") return { cols: 1, rows: 2 };
  if (layout === "2x2") return { cols: 2, rows: 2 };
  // manga_strip: vertical sequence
  return { cols: 1, rows: panelCount };
}

function getPanelDimensions(layout: string): { width: number; height: number } {
  if (layout === "2x2") return { width: PANEL_WIDTH / 2 - PANEL_GAP, height: 300 };
  return { width: PANEL_WIDTH, height: 380 };
}

const MangaCanvas = forwardRef<MangaCanvasHandle, MangaCanvasProps>(
  function MangaCanvas({ panels, layout }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<FabricCanvas | null>(null);
    const fabricLibRef = useRef<FabricLib | null>(null);

    const initCanvas = useCallback(async () => {
      if (!canvasRef.current) return;

      // Dynamically import fabric to avoid SSR issues
      const fabricModule = await import("fabric");
      const fabric = fabricModule as unknown as FabricLib;
      fabricLibRef.current = fabric;

      const { cols, rows } = getPanelLayout(layout, panels.length);
      const { width: panelW, height: panelH } = getPanelDimensions(layout);

      const canvasWidth = cols * panelW + (cols + 1) * PANEL_GAP;
      const canvasHeight = rows * panelH + (rows + 1) * PANEL_GAP;

      // Dispose old canvas if exists
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }

      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: "#1a1a2e",
        selection: true,
        width: canvasWidth,
        height: canvasHeight,
      });
      fabricRef.current = fabricCanvas;

      // Draw each panel
      for (let i = 0; i < panels.length; i++) {
        const col = layout === "2x2" ? i % 2 : 0;
        const row = layout === "2x2" ? Math.floor(i / 2) : i;

        const x = PANEL_GAP + col * (panelW + PANEL_GAP);
        const y = PANEL_GAP + row * (panelH + PANEL_GAP);

        const panel = panels[i];

        // Panel border background
        const borderRect = new fabric.Rect({
          left: x - PANEL_BORDER,
          top: y - PANEL_BORDER,
          width: panelW + PANEL_BORDER * 2,
          height: panelH + PANEL_BORDER * 2,
          fill: "#ffffff",
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(borderRect);

        // Panel background
        const bgRect = new fabric.Rect({
          left: x,
          top: y,
          width: panelW,
          height: panelH,
          fill: "#0d1117",
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(bgRect);

        // Load image if available
        if (panel.image_url) {
          try {
            const img = await fabric.FabricImage.fromURL(panel.image_url, {
              crossOrigin: "anonymous",
            });

            // Scale image to fit panel
            const scaleX = panelW / (img as unknown as { width: number }).width;
            const scaleY = panelH / (img as unknown as { height: number }).height;
            const scale = Math.min(scaleX, scaleY);

            img.set({
              left: x,
              top: y,
              scaleX: scale,
              scaleY: scale,
              selectable: false,
              evented: false,
            });
            fabricCanvas.add(img);
          } catch {
            // If image fails to load, show placeholder
            const placeholder = new fabric.Rect({
              left: x,
              top: y,
              width: panelW,
              height: panelH,
              fill: "#1f2937",
              selectable: false,
              evented: false,
            });
            fabricCanvas.add(placeholder);

            const placeholderText = new fabric.Textbox("🖼 Image loading...", {
              left: x + 10,
              top: y + panelH / 2 - 20,
              width: panelW - 20,
              fontSize: 16,
              fill: "#6b7280",
              textAlign: "center",
              selectable: false,
              evented: false,
            });
            fabricCanvas.add(placeholderText);
          }
        }

        // Add narration box at top
        if (panel.narration_text) {
          const narrationBg = new fabric.Rect({
            left: x + 4,
            top: y + 4,
            width: panelW - 8,
            height: 40,
            fill: "rgba(255,255,200,0.95)",
            rx: 4,
            ry: 4,
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(narrationBg);

          const narrationText = new fabric.Textbox(panel.narration_text, {
            left: x + 8,
            top: y + 8,
            width: panelW - 16,
            fontSize: 12,
            fill: "#000000",
            fontFamily: "Arial",
            textAlign: "left",
            selectable: true,
            editable: true,
          });
          fabricCanvas.add(narrationText);
        }

        // Add speech bubble
        if (panel.dialogue_text) {
          const bubbleY = y + panelH - 100;
          const bubbleW = Math.min(panelW - 20, 280);
          const bubbleH = 70;

          const speechBubbleBg = new fabric.Rect({
            left: x + 10,
            top: bubbleY,
            width: bubbleW,
            height: bubbleH,
            fill: "rgba(255,255,255,0.95)",
            rx: 20,
            ry: 20,
            stroke: "#000000",
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(speechBubbleBg);

          const dialogueText = new fabric.Textbox(panel.dialogue_text, {
            left: x + 18,
            top: bubbleY + 10,
            width: bubbleW - 16,
            fontSize: 13,
            fill: "#000000",
            fontFamily: "Arial",
            fontWeight: "bold",
            textAlign: "center",
            selectable: true,
            editable: true,
          });
          fabricCanvas.add(dialogueText);
        }

        // Add thought bubble
        if (panel.thought_text) {
          const thoughtBg = new fabric.Ellipse({
            left: x + panelW - 200,
            top: y + panelH - 120,
            rx: 90,
            ry: 45,
            fill: "rgba(220,230,255,0.95)",
            stroke: "#000000",
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(thoughtBg);

          const thoughtText = new fabric.Textbox(panel.thought_text, {
            left: x + panelW - 190,
            top: y + panelH - 112,
            width: 160,
            fontSize: 12,
            fill: "#000000",
            fontFamily: "Arial",
            fontStyle: "italic",
            textAlign: "center",
            selectable: true,
            editable: true,
          });
          fabricCanvas.add(thoughtText);
        }

        // Add SFX text
        if (panel.sfx_text) {
          const sfxText = new fabric.Textbox(panel.sfx_text, {
            left: x + panelW / 2 - 60,
            top: y + panelH / 2 - 30,
            width: 120,
            fontSize: 28,
            fill: "#ff3333",
            fontFamily: "Impact, Arial",
            fontWeight: "bold",
            textAlign: "center",
            stroke: "#000000",
            strokeWidth: 1,
            selectable: true,
            editable: true,
          });
          fabricCanvas.add(sfxText);
        }
      }

      fabricCanvas.renderAll();
    }, [panels, layout]);

    useEffect(() => {
      initCanvas();
      return () => {
        if (fabricRef.current) {
          fabricRef.current.dispose();
          fabricRef.current = null;
        }
      };
    }, [initCanvas]);

    const addSpeechBubble = useCallback(() => {
      if (!fabricRef.current || !fabricLibRef.current) return;
      const fabric = fabricLibRef.current;
      const canvas = fabricRef.current;

      const bubbleBg = new fabric.Rect({
        left: 0,
        top: 0,
        width: 200,
        height: 80,
        fill: "rgba(255,255,255,0.95)",
        rx: 20,
        ry: 20,
        stroke: "#000000",
        strokeWidth: 2,
      });

      const bubbleText = new fabric.Textbox("Edit this text...", {
        left: 10,
        top: 18,
        width: 180,
        fontSize: 14,
        fill: "#000000",
        fontFamily: "Arial",
        fontWeight: "bold",
        textAlign: "center",
        editable: true,
      });

      const group = new fabric.Group([bubbleBg, bubbleText], {
        left: 50,
        top: 50,
        selectable: true,
      });
      canvas.add(group);
      canvas.renderAll();
    }, []);

    const addThoughtBubble = useCallback(() => {
      if (!fabricRef.current || !fabricLibRef.current) return;
      const fabric = fabricLibRef.current;
      const canvas = fabricRef.current;

      const thoughtBg = new fabric.Ellipse({
        left: 0,
        top: 0,
        rx: 90,
        ry: 45,
        fill: "rgba(220,230,255,0.95)",
        stroke: "#000000",
        strokeWidth: 2,
      });

      const thoughtText = new fabric.Textbox("Thinking...", {
        left: 10,
        top: 20,
        width: 160,
        fontSize: 13,
        fill: "#000000",
        fontFamily: "Arial",
        fontStyle: "italic",
        textAlign: "center",
        editable: true,
      });

      const group = new fabric.Group([thoughtBg, thoughtText], {
        left: 80,
        top: 80,
        selectable: true,
      });
      canvas.add(group);
      canvas.renderAll();
    }, []);

    const addNarrationBox = useCallback(() => {
      if (!fabricRef.current || !fabricLibRef.current) return;
      const fabric = fabricLibRef.current;
      const canvas = fabricRef.current;

      const narrationBg = new fabric.Rect({
        left: 0,
        top: 0,
        width: 250,
        height: 50,
        fill: "rgba(255,255,200,0.95)",
        rx: 4,
        ry: 4,
      });

      const narrationText = new fabric.Textbox("Narration text here...", {
        left: 8,
        top: 10,
        width: 234,
        fontSize: 12,
        fill: "#000000",
        fontFamily: "Arial",
        textAlign: "left",
        editable: true,
      });

      const group = new fabric.Group([narrationBg, narrationText], {
        left: 30,
        top: 30,
        selectable: true,
      });
      canvas.add(group);
      canvas.renderAll();
    }, []);

    const deleteSelected = useCallback(() => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length > 0) {
        activeObjects.forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }, []);

    const downloadCanvas = useCallback(() => {
      if (!fabricRef.current || !fabricLibRef.current) return;
      const fabric = fabricLibRef.current;
      const canvas = fabricRef.current;

      // Add watermark at bottom-right with dynamic positioning
      const watermarkText = "Generated by Manga Create Using AI";
      const fontSize = 11;
      const padding = 8;
      const approxTextWidth = watermarkText.length * (fontSize * 0.55);
      const watermark = new fabric.Textbox(watermarkText, {
        left: canvas.width - approxTextWidth - padding,
        top: canvas.height - fontSize - padding,
        width: approxTextWidth + padding,
        fontSize,
        fill: "rgba(255,255,255,0.6)",
        fontFamily: "Arial",
        textAlign: "right",
        selectable: false,
        evented: false,
      });
      canvas.add(watermark);
      canvas.renderAll();

      const dataURL = canvas.toDataURL({
        format: "jpeg",
        quality: 0.92,
        multiplier: 2,
      });

      canvas.remove(watermark);
      canvas.renderAll();

      const link = document.createElement("a");
      link.download = "manga-comic.jpg";
      link.href = dataURL;
      link.click();
    }, []);

    useImperativeHandle(ref, () => ({
      downloadCanvas,
      addSpeechBubble,
      addThoughtBubble,
      addNarrationBox,
      deleteSelected,
    }));

    return (
      <div className="overflow-auto">
        <canvas ref={canvasRef} className="rounded-lg shadow-2xl" />
      </div>
    );
  }
);

export default MangaCanvas;
