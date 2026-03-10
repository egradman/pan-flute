import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pan Flute Designer — by Dash, age 9",
  description:
    "Design your own custom pan flute with our interactive piano roll sequencer. Pick a melody, and we'll generate a 3D-printable pan flute tuned to play it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="font-body antialiased">
        <a href="#editor" className="skip-link">
          Skip to flute editor
        </a>
        {children}
      </body>
    </html>
  );
}
