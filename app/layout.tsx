import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CapiTalk — Connect Beyond Your Department",
  description:
    "Campus-wide random chat platform for students. Meet students across departments in safe, real-time, private conversations.",
  keywords: [
    "CapiTalk",
    "Campus Chat",
    "Student Chat",
    "College Chat",
    "Random Chat",
    "Student Community",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-[#f4f4f0] text-[#000000] selection:bg-[#ff90e8] selection:text-[#000000]">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
