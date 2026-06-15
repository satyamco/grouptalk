"use client";

import { useProfile } from "@/hooks/use-profile";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onProfileClick: () => void;
}

export function Header({ onProfileClick }: HeaderProps) {
  const router = useRouter();
  const { profile, clearProfile } = useProfile();

  const handleLogout = () => {
    clearProfile();
    toast.info("Logged out successfully");
    router.replace("/onboarding");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
            VoxRoom
          </span>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>

        {/* User Info & Settings */}
        {profile && (
          <div className="flex items-center gap-3">
            <button
              onClick={onProfileClick}
              className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/5 bg-white/5 p-1.5 sm:px-3 sm:py-1.5 hover:bg-white/10 transition duration-200 outline-none active-bounce text-sm font-medium"
            >
              <span className="text-lg leading-none">{profile.emoji}</span>
              <span className="max-w-[100px] truncate text-foreground/90 hidden sm:inline">
                {profile.name}
              </span>
            </button>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-full border border-white/5 bg-white/5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition duration-200 active-bounce"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
