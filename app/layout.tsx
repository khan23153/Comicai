import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MemeComicGen — AI Comic & Meme Generator",
  description:
    "Generate funny, Instagram-style short comics and memes using AI image generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-950">{children}</body>
    </html>
  );
}
