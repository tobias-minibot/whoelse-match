import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
  description: "Exemplar-anchored discovery. Dating, apartment, and jobs are costumes on one matching network.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const inner = (
    <html lang="en">
      <body className={`${dm.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  );
  if (!publishableKey) return inner;
  return <ClerkProvider publishableKey={publishableKey}>{inner}</ClerkProvider>;
}
