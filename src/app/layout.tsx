import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiskMap",
  description: "Repository knowledge-concentration risk analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
