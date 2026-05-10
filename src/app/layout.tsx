import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Thai, Noto_Sans_SC } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-thai",
  display: "swap",
});

const notoSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-cjk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LinForge HR — LINE-First HR for Modern Factories",
    template: "%s · LinForge HR",
  },
  description:
    "The only HR system your factory needs — built entirely on LINE. Clock-in, leave, payroll, and AI assistant inside the app your team opens every day.",
  keywords: [
    "LINE HR",
    "factory HR Thailand",
    "LINE OA HR",
    "LIFF HR",
    "Thai labor law payroll",
    "geofence clock-in",
    "shift scheduling",
    "Mastra AI HR",
  ],
  authors: [{ name: "LinForge" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "LinForge HR — LINE-First HR for Modern Factories",
    description:
      "Clock-in, leave, payroll, and AI assistant — all inside LINE. Built for factories in Thailand, Taiwan, and Southeast Asia.",
    type: "website",
    siteName: "LinForge HR",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinForge HR — LINE-First HR for Modern Factories",
    description:
      "Clock-in, leave, payroll, and AI assistant — all inside LINE. Built for factories.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${notoThai.variable} ${notoSC.variable}`}>
      <body className="min-h-screen bg-white text-navy-900 antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
          <Toaster
            position="top-center"
            richColors
            theme="light"
            toastOptions={{
              classNames: {
                toast:
                  "border border-navy-100 shadow-card !rounded-xl !text-navy-900 !bg-white",
                title: "!text-navy-900 !font-semibold",
                description: "!text-navy-500",
                actionButton: "!bg-orange-400 !text-white",
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
