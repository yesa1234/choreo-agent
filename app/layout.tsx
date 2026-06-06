import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "编舞 Agent · 排练工作台",
  description: "基于意象锚定的动觉阻抗场理论的 AI 编舞陪练",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
