import type { Metadata } from "next";
import Script from "next/script";
import { Poppins } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
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
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", poppins.variable, "font-sans")} suppressHydrationWarning>

      <body className="min-h-full flex flex-col bg-[#f4f4f0] dark:bg-[#0e0e11] text-[#000000] dark:text-[#f4f4f6] selection:bg-[#ff90e8] selection:text-[#000000] transition-colors duration-200">
        {children}
        <SpeedInsights />
        <Analytics />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
