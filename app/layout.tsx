import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webサイト表示速度 診断ツール | L'uoly Web",
  description:
    "URLを入れるだけで、サイトの表示速度とCore Web Vitalsを無料で診断します。名古屋のWeb制作 L'uoly Web の診断ツールです。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
