import type { Metadata } from "next";
import "./globals.css";
import ChatWidgetWrapper from "@/components/ChatWidgetWrapper";

export const metadata: Metadata = {
  title: "FinanceAI",
  description: "AI-powered personal finance manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ChatWidgetWrapper />
      </body>
    </html>
  );
}
