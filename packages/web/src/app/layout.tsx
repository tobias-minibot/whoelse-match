import type { Metadata } from "next";
import { Figtree, Newsreader } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
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

const clerkAppearance = {
  variables: {
    colorBackground: "#12100d",
    colorInputBackground: "#1a1713",
    colorText: "#f3ece3",
    colorTextSecondary: "#9a9084",
    colorPrimary: "#d07a45",
    colorNeutral: "#f3ece3",
    borderRadius: "0.9rem",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const inner = (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
  if (!publishableKey) return inner;
  return (
    <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
      {inner}
    </ClerkProvider>
  );
}
