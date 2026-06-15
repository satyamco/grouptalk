"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/use-profile";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ProfileDialog = dynamic(
  () => import("./profile-dialog").then((mod) => mod.ProfileDialog),
  { ssr: false }
);

interface AppShellProps {
  children: React.ReactNode;
  activeTab?: "discover";
  onCreateClick?: () => void;
}

export function AppShell({ children, activeTab = "discover", onCreateClick }: AppShellProps) {
  const { profile, isLoaded } = useProfile();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Enforce onboarding gate
  useEffect(() => {
    if (isLoaded && !profile) {
      router.replace("/onboarding");
    }
  }, [isLoaded, profile, router]);

  if (!isLoaded || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 sm:pb-0">
      <Header onProfileClick={() => setIsProfileOpen(true)} />
      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <BottomNav
        activeTab={activeTab}
        onCreateClick={onCreateClick}
        onProfileClick={() => setIsProfileOpen(true)}
        profileEmoji={profile.emoji}
      />
      {isProfileOpen && (
        <ProfileDialog isOpen={isProfileOpen} onOpenChange={setIsProfileOpen} />
      )}
    </div>
  );
}
