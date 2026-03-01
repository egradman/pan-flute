import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pan Flute Designer",
  description:
    "Design your own custom pan flute with our interactive piano roll sequencer. Pick a melody, and we'll generate a 3D-printable pan flute tuned to play it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
