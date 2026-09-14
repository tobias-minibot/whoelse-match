import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
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
    colorBackground: "#000000",
    colorInputBackground: "#0f1113",
    colorText: "#e7e9ea",
    colorTextSecondary: "#8b98a5",
    colorPrimary: "#e37a3d",
    colorNeutral: "#e7e9ea",
    borderRadius: "0.75rem",
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
