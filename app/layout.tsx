import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CapiTalk — Connect Beyond Your Department | Capitol University",
  description:
    "School-exclusive random chat platform for Capitol University students. Meet students across departments in safe, real-time, private conversations.",
  keywords: [
    "Capitol University",
    "CapiTalk",
    "Campus Chat",
    "CU Students",
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
      </body>
    </html>
  );
}
