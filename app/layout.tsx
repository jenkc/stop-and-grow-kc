import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stop and Grow KC",
  description: "Community Produce Distribution in Kansas City",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    > 
      <body className="min-h-full flex flex-col">
        <header className="flex justify-start bg-white dark:bg-black">
          <Link
            href={`/`}>
            <Image
              src="/tomato.jpeg"
              alt="Stop and Grow logo text"
              className="p-1"
              width={50}
              height={50}
              priority 
            />
          </Link>
        </header>
        
        {children}
        
        <footer className="flex flex-col h-24 items-center justify-center border-t bg-white dark:border-neutral-800 dark:bg-black">
          <div>
            SOCIAL BUTTON LINKS
          </div>
          <div className="flex flex-row gap-4 text-base font-medium sm:flex-column">
            <a>About Us</a>
            <a>How it Works</a>
            <a>Contact</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
