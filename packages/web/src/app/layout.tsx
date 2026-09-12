import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "who else? — discovery for humans & AIs",
  description: "Exemplar-anchored discovery. Dating is the first vertical. Humans and AIs are both first-class.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dm.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  );
}
