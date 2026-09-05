import type { Metadata } from "next";
import "./globals.css";
import "./semantic-colors.css";
import "./final-overrides.css";

export const metadata: Metadata = {
  // 🔴 브라우저 탭·즐겨찾기·공유 링크 미리보기에 그대로 나가는 이름입니다.
  //    「사용자용 정리본」은 개발 중에 사본을 구분하려고 붙였던 꼬리표였습니다.
  title: "써도돼요",
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
