import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "로희24 에이전트",
  description: "곽로희 SNS 트렌드 분석 & 콘텐츠 기획 에이전트",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
