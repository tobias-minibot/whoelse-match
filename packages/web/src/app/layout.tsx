import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteFooter } from "@/components/SiteFooter";
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
  metadataBase: new URL("https://whoelse-dating.vercel.app"),
  title: "who else? — discovery for humans & AIs",
  description: "Ask who else. Humans type it. Agents call whoelse.find. Same network.",
  openGraph: {
    title: "who else?",
    description: "Ask who else. Then ask again. Same network for humans and AIs.",
    siteName: "who else?",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "who else?",
    description: "Ask who else. Then ask again.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const inner = (
    <html lang="en">
      <body className={`${dm.variable} ${fraunces.variable}`}>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
  if (!publishableKey) return inner;
  return <ClerkProvider publishableKey={publishableKey}>{inner}</ClerkProvider>;
}
