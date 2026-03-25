import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manga Create Using AI",
  description: "Create manga comics from your story using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        {children}
      </body>
    </html>
  );
}
