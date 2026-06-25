import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doc Transcribe",
  description: "Transcribe handwritten text from images using Claude.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
