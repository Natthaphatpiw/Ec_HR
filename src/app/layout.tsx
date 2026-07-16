import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Sarabun } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sarabun",
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
    default: "EC AIHR — LINE-First HR SaaS for Every Business",
    template: "%s · EC AIHR",
  },
  description:
    "The HR system your team already knows how to use — built entirely on LINE. Clock-in, leave, payroll, and AI assistant inside the app your team opens every day. By eCloudtec Thailand.",
  keywords: [
    "LINE HR",
    "HR SaaS Thailand",
    "LINE OA HR",
    "LIFF HR",
    "Thai labor law payroll",
    "shift scheduling",
    "AI HR assistant",
    "eCloudtec Thailand",
    "EC AIHR",
  ],
  authors: [{ name: "eCloudtec Thailand" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  icons: {
    icon: "/brand/ecaihr-logo.png",
    apple: "/brand/ecaihr-logo.png",
    shortcut: "/brand/ecaihr-logo.png",
  },
  openGraph: {
    title: "EC AIHR — LINE-First HR SaaS for Every Business",
    description:
      "Clock-in, leave, payroll, and AI assistant — all inside LINE. By eCloudtec Thailand.",
    type: "website",
    siteName: "EC AIHR",
    images: [
      {
        url: "/brand/ecaihr-logo.png",
        width: 2172,
        height: 724,
        alt: "EC AIHR by eCloudtec Thailand",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EC AIHR — LINE-First HR SaaS for Every Business",
    description:
      "Clock-in, leave, payroll, and AI assistant — all inside LINE. By eCloudtec Thailand.",
    images: ["/brand/ecaihr-logo.png"],
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
    <html lang={locale} className={`${sarabun.variable} ${notoSC.variable}`}>
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
