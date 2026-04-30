import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "نِبْراس - مبادرة لدعم رواد الأعمال الناشئين",
  description: "مبادرة مجانية تُجهّز رواد الأعمال الناشئين للقبول في الحاضنات والمسرّعات عبر رحلة إرشادية مُهيكلة",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-['Noto_Sans_Arabic',sans-serif] antialiased bg-background text-foreground">
        {children}
        <Toaster position="top-left" richColors />
      </body>
    </html>
  );
}
