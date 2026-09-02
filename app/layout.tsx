import type { Metadata } from "next";
import "./globals.css";
import "./semantic-colors.css";
import "./final-overrides.css";

export const metadata: Metadata = {
  title: "CHECKUMAIT 사용자용 정리본",
  description: "창업지원금 지출 전 비목·규정·사전절차·필요 증빙을 확인하는 AI 금융 비서",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
