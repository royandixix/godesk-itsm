import type { Metadata } from "next";
import { Geist } from "next/font/google";

import {
  LanguageProvider,
} from "@/components/language-provider";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoDesk",
  description:
    "Helpdesk & Ticket Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`${geist.className} antialiased`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}