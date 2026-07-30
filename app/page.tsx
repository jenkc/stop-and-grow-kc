import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <Image
          src="/tomato.jpeg"
          alt="Stop and Grow logo text"
          width={150}
          height={150}
          priority
        />
        <Image
          src="/s-g-text.jpeg"
          alt="Stop and Grow logo text"
          width={500}
          height={200}
          priority
        />
        <p className="text-lg text-center font-bold p-5">KC Community Produce Distribution</p>
        <div className="flex flex-row gap-4 p-5 text-base font-medium sm:flex-column">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href={`/Login`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Log In
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href={`/Signup`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Sign Up
          </Link>
        </div>
        <div className="flex flex-col gap-4 p-5 text-base font-medium sm:flex-column">
          Temporary page links for development:
          <Link
            href={`/Order`}
            className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-violet-200 px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            target="_blank"
            rel="noopener noreferrer"
            >
              Order Page
            </Link>
            <Link 
              href={`/Admin`}
              className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-violet-200 px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
              target="_blank"
              rel="noopener noreferrer"
            >
              Admin Page
            </Link>
        </div>
      </main>
  );
}
