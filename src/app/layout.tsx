import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Chaos Button | The Useless Button Laboratory",
  description:
    "One button. Four phases of denial. Twenty-nine ways to do absolutely nothing useful. A narrative chaos engine disguised as a UI element.",
  keywords: ["chaos button", "useless button", "interactive experiment", "web toy", "confetti", "useless machine"],
  authors: [{ name: "blankcode-alt" }],
  openGraph: {
    title: "The Chaos Button",
    description: "A single button that evolves from polite to unhinged to enlightened. Press at your own risk.",
    siteName: "The Useless Button Laboratory",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
