import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16">
        <Image
          src="/tomato_transp_bg_cropped.png"
          alt="Stop and Grow logo text"
          width={100}
          height={100}
          className="w-auto h-auto"
          priority
        />
        <Image
          src="/wordmark.png"
          alt="Stop and Grow logo text"
          width={545}
          height={218}
          className="h-auto w-auto max-w-[300px] dark:invert dark:brightness-125"
          priority
        />
        <p className="text-lg text-center font-bold p-5">
          KC Community Produce Distribution
        </p>

        <div className="flex flex-row gap-4 p-5">
          {/* render + nativeButton={false} is base-ui's version of asChild:
              the Button's styling is applied to the Link it renders. */}
          <Button size="lg" className="md:w-[158px]" nativeButton={false}
            render={<Link href="/Login">Log In</Link>} />
          <Button size="lg" className="md:w-[158px]" nativeButton={false}
            render={<Link href="/Signup">Sign Up</Link>} />
        </div>

        <div className="flex flex-col items-center gap-4 p-5">
          <p className="text-sm text-muted-foreground">
            Temporary page links for development:
          </p>
          <Button variant="outline" size="lg" className="md:w-[158px]" nativeButton={false}
            render={<Link href="/Order">Order Page</Link>} />
          <Button variant="outline" size="lg" className="md:w-[158px]" nativeButton={false}
            render={<Link href="/Admin">Admin Page</Link>} />
        </div>
      </main>
  );
}
