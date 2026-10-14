import type { Metadata } from "next";
import { Anek_Latin } from "next/font/google";
import "./globals.css";

const anek = Anek_Latin({
  variable: "--font-anek",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Idli admin",
  description: "Internal tool for managing restaurants, menus, tags and reviews.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anek.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
