import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Advanced Table Demo",
  description:
    "Interactive table experience powered by nextjs-reusable-table.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          "min-h-screen bg-zinc-100 text-zinc-900 antialiased",
          "dark:bg-neutral-950 dark:text-zinc-100",
        ].join(" ")}
      >
        {children}
      </body>
    </html>
  );
}
