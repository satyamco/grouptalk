"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";

export default function LandingPage() {
  const router = useRouter();
  const { profile, isLoaded } = useProfile();

  useEffect(() => {
    if (isLoaded) {
      if (profile) {
        router.replace("/rooms");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [isLoaded, profile, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="relative flex flex-col items-center space-y-4">
        {/* Glow behind the title */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 opacity-40 blur-xl"></div>
        
        <div className="relative text-center space-y-2">
          <h1 className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent">
            VoxRoom
          </h1>
          <p className="text-muted-foreground text-sm tracking-wide font-medium">
            CONNECTING VOICE...
          </p>
        </div>

        {/* Pulsing loading bar */}
        <div className="relative w-40 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full animate-[shimmer_1.5s_infinite_linear]"></div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            left: -50%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </main>
  );
}
