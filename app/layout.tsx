import type { Metadata } from "next";
import { Geist, Geist_Mono, Raleway } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const raleway = Raleway({subsets:['latin'],variable:'--font-sans'});

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
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", raleway.variable)}
    > 
      <body className="min-h-full flex flex-col bg-white">
        <header className="flex justify-start">
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
        
        <footer className="flex flex-col h-24 mt-5 items-center justify-center border-t bg-white">
          {/* Social media links */}
          <div className="flex flex-row mb-2 gap-4">
            <Link href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
              <Image src="/facebook.png" alt="Facebook link" width={30} height={30} />
            </Link>
            <Link href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
              <Image src="/instagram.png" alt="Instagram link" width={30} height={30} />
            </Link>        
            <Link href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">
              <Image src="/linkedin.png" alt="LinkedIn link" width={30} height={30} />
            </Link>
          </div>
          <div className="flex flex-row gap-4 text-base font-medium sm:flex-column">
            <a href="/About">About Us</a>
            <a href="/HowItWorks">How it Works</a>
            <a href="/Contact">Contact</a>
          </div>
        </footer>

      </body>
    </html>
  );
}
