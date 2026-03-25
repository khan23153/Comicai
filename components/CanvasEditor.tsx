"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import type { Canvas, FabricImage, FabricText, Rect } from "fabric";

export interface CanvasEditorHandle {
  addImage: (url: string) => void;
  addText: (text: string) => void;
  addSpeechBubble: (text: string) => void;
  exportPNG: () => string;
}

interface CanvasEditorProps {
  width?: number;
  height?: number;
}

interface FabricRefs {
  canvas: Canvas;
  FabricImage: typeof FabricImage;
  FabricText: typeof FabricText;
  Rect: typeof Rect;
}

const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(
  function CanvasEditor({ width = 800, height = 600 }, ref) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<FabricRefs | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
      // Guard against double-init in React StrictMode
      if (initializedRef.current) return;
      initializedRef.current = true;

      let canvas: Canvas | undefined;

      async function initCanvas() {
        const {
          Canvas,
          Rect: FabricRect,
          FabricText: FabricTextClass,
          FabricImage: FabricImageClass,
        } = await import("fabric");

        if (!canvasElRef.current) return;

        canvas = new Canvas(canvasElRef.current, {
          width,
          height,
          backgroundColor: "#1f2937",
          preserveObjectStacking: true,
        });

        fabricRef.current = {
          canvas,
          FabricImage: FabricImageClass,
          FabricText: FabricTextClass,
          Rect: FabricRect,
        };
      }

      initCanvas();

      return () => {
        if (canvas) canvas.dispose();
        fabricRef.current = null;
        // Note: initializedRef is intentionally NOT reset here.
        // In React StrictMode, the cleanup+re-run cycle would cause a
        // double-init warning from fabric.js if we reset the guard.
      };
      // width/height are intentionally omitted — canvas is sized once on mount.
      // Resizing requires a full remount via a key prop change on the parent.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      addImage(url: string) {
        const refs = fabricRef.current;
        if (!refs) return;
        const { canvas, FabricImage } = refs;

        FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
          img.set({ left: 20, top: 20, selectable: true });
          img.scaleToWidth(Math.min(width / 2 - 30, 360));
          canvas.add(img);
          canvas.renderAll();
        });
      },

      addText(text: string) {
        const refs = fabricRef.current;
        if (!refs) return;
        const { canvas, FabricText } = refs;

        const t = new FabricText(text, {
          left: 50,
          top: 50,
          fontSize: 24,
          fill: "#ffffff",
          fontFamily: "Arial",
          editable: true,
          selectable: true,
        });
        canvas.add(t);
        canvas.setActiveObject(t);
        canvas.renderAll();
      },

      addSpeechBubble(text: string) {
        const refs = fabricRef.current;
        if (!refs) return;
        const { canvas, Rect, FabricText } = refs;

        const bubble = new Rect({
          left: 60,
          top: 60,
          width: 180,
          height: 70,
          fill: "#ffffff",
          rx: 18,
          ry: 18,
          stroke: "#374151",
          strokeWidth: 2,
          selectable: true,
        });

        const label = new FabricText(text, {
          left: 75,
          top: 80,
          fontSize: 16,
          fill: "#111827",
          fontFamily: "Arial",
          width: 150,
          editable: true,
          selectable: true,
        });

        canvas.add(bubble, label);
        canvas.setActiveObject(label);
        canvas.renderAll();
      },

      exportPNG(): string {
        const refs = fabricRef.current;
        if (!refs) return "";
        const { canvas, FabricText } = refs;

        // Add watermark temporarily
        const watermark = new FabricText("MemeComicGen", {
          left: width - 140,
          top: height - 28,
          fontSize: 14,
          fill: "rgba(255,255,255,0.6)",
          fontFamily: "Arial",
          selectable: false,
          evented: false,
        });
        canvas.add(watermark);
        canvas.renderAll();

        const dataURL = canvas.toDataURL({
          format: "png",
          quality: 1,
          multiplier: 2,
        });

        canvas.remove(watermark);
        canvas.renderAll();

        return dataURL;
      },
    }));

    return (
      <div className="overflow-auto rounded-xl border border-gray-700 shadow-2xl bg-gray-800">
        <canvas ref={canvasElRef} />
      </div>
    );
  }
);

export default CanvasEditor;
