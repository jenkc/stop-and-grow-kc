import type { Metadata } from "next";
import { Raleway, DM_Mono, Fraunces } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthNav, AuthNavFallback } from "@/components/auth-nav";

const fraunces = Fraunces({
  subsets:['latin'],
  variable: '--font-fraunces',
  axes: ["SOFT", "WONK", "opsz"]
});

// The display face for headings. `swap` means text paints in the fallback
// immediately rather than sitting invisible while the .otf loads.
const brightDemo = localFont({
  src: './fonts/bright-demo.otf',
  variable: '--font-bright',
  display: 'swap',
});

const raleway = Raleway({subsets:['latin'],variable:'--font-raleway'});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets:['latin'],
  variable:'--font-dm-mono'});

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
      suppressHydrationWarning
      className={cn("h-full", "antialiased", raleway.variable, dmMono.variable, fraunces.variable, brightDemo.variable)}
    > 
      <body className="min-h-full flex flex-col">
        <ThemeProvider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem={false}
        disableTransitionOnChange
        >
          <div className="grain" aria-hidden="true" />
          
          <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link
              href={`/`}
              className="flex items-center gap-2.5">
              <Image
              src="/tomato_transp_bg_cropped.png"
              alt=""
              aria-hidden="true"
              width={1526}
              height={985}
              className="h-8 w-auto"
              priority
              />
              <Image
              src="/wordmark.png"
              alt="Stop and Grow KC"
              width={545}
              height={218}
              className="h-6 w-auto dark:invert dark:brightness-125"
              priority
              />
            </Link>

            {/* gap-1, not gap-4: these are ghost Buttons carrying their own
                px, so a wide gap reads as a scattered row rather than one nav
                cluster. */}
            <nav className="flex items-center gap-1">
              {/* Only this subtree awaits cookies(); the logo, footer, and page
                  content render without waiting on Supabase. */}
              <Suspense fallback={<AuthNavFallback />}>
                <AuthNav />
              </Suspense>
              <ThemeToggle />
            </nav>
          </header>

          {children}
        
          <footer className="flex flex-col h-24 mt-5 items-center justify-center border-t">
            {/* Social media links */}
            <div className="flex flex-row mb-2 gap-4">
              <Link href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
                <Image src="/facebook.png" alt="Facebook link" width={30} height={30} />
              </Link>
              <Link href="https://www.instagram.com/stopandgrowkc/" target="_blank" rel="noopener noreferrer">
                <Image src="/instagram.png" alt="Instagram link" width={30} height={30} />
              </Link>        
              <Link href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">
                <Image src="/linkedin.png" alt="LinkedIn link" width={30} height={30} />
              </Link>
            </div>
            <div className="flex flex-row gap-4 text-base font-medium sm:flex-column">
              <a href="/HowItWorks">About Us</a>
              <a href="/HowItWorks">How it Works</a>
              <a href="/Contact">Contact</a>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
