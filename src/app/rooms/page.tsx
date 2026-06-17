"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RoomSearch } from "@/components/rooms/room-search";
import { RoomCard } from "@/components/rooms/room-card";
import { RoomWithCounts } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, RefreshCw, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePWA } from "@/hooks/use-pwa";
import dynamic from "next/dynamic";

const CreateRoomForm = dynamic(
  () => import("@/components/rooms/create-room-form").then((mod) => mod.CreateRoomForm),
  { ssr: false }
);

export default function RoomsDiscoveryPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { showInstallPrompt, isIOS, isStandalone, triggerInstall } = usePWA();
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("voxroom-pwa-dismissed") === "true";
    setBannerDismissed(dismissed);
  }, []);

  const handleDismissBanner = () => {
    localStorage.setItem("voxroom-pwa-dismissed", "true");
    setBannerDismissed(true);
  };

  const handleInstallClick = async () => {
    const installed = await triggerInstall();
    if (installed) {
      handleDismissBanner();
    }
  };

  // Fetch rooms list from API
  const fetchRooms = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = new URL("/api/rooms", window.location.origin);
      if (selectedCategory && selectedCategory !== "all") {
        url.searchParams.set("category", selectedCategory);
      }

      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }

      const data = await response.json();
      setRooms(data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to load active rooms");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  // Refetch when category changes
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);



  const handleRoomCreated = (roomId: string) => {
    setIsCreateOpen(false);
    router.push(`/rooms/${roomId}`);
  };

  return (
    <AppShell activeTab="discover" onCreateClick={() => setIsCreateOpen(true)}>
      <div className="space-y-6">
        {/* PWA Install Banner */}
        {!isStandalone && !bannerDismissed && (showInstallPrompt || isIOS) && (
          <div className="glass-panel border border-violet-500/25 bg-gradient-to-r from-violet-950/30 to-cyan-950/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-in fade-in slide-in-from-top-5 duration-300">
            <div className="flex gap-3 text-left">
              <span className="text-2xl select-none hidden sm:inline">📱</span>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-violet-400">Install VoxRoom App</h4>
                <p className="text-xs text-zinc-300 font-medium">
                  {isIOS 
                    ? "Add VoxRoom to your Home Screen: tap the Share icon (📤) in Safari and select 'Add to Home Screen'."
                    : "Add VoxRoom to your Home Screen for a native app-like experience and direct audio access!"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={handleDismissBanner}
                className="h-9 px-3 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/5 active-bounce transition-all duration-200 cursor-pointer"
              >
                Maybe Later
              </button>
              {showInstallPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-md shadow-violet-600/25 active-bounce transition-all duration-200 cursor-pointer"
                >
                  Add to Home Screen
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top welcome & action header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
              Discover Rooms
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Join active discussions or create your own space.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => fetchRooms(true)}
              disabled={refreshing || loading}
              className={className("glass-input rounded-xl border border-white/5 active-bounce h-10 w-10 text-muted-foreground hover:text-foreground", {
                "animate-spin": refreshing
              })}
              title="Refresh Room List"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl active-bounce h-10 shadow-lg shadow-violet-500/15 hidden sm:flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Room</span>
            </Button>
          </div>
        </div>

        {/* Category filter */}
        <RoomSearch
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />

        {/* Room Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-5 h-48 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-6 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-4">
                  <div className="flex gap-2 items-center">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl min-h-[300px] space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500/10 to-cyan-500/10 border border-white/5 text-primary">
              <Radio className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-lg font-bold text-foreground">No Rooms Found</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                There are no active voice rooms in this category right now. Be the first to start a conversation!
              </p>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 hover:border-transparent rounded-xl text-sm font-bold px-6 h-10 active-bounce mt-2"
            >
              Start a Room
            </Button>
          </div>
        )}
      </div>

      {/* Create Room Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="glass-panel border-white/10 text-foreground w-[92vw] sm:max-w-sm md:max-w-md lg:max-w-lg rounded-2xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Create Voice Room
            </DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the room name, description, and category details to start your own room.
            </DialogDescription>
          </DialogHeader>
          {isCreateOpen && (
            <CreateRoomForm
              onSuccess={handleRoomCreated}
              onCancel={() => setIsCreateOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// Utility class helper since custom classnames might be needed
function className(...args: any[]) {
  return args
    .flatMap((arg) => {
      if (typeof arg === "string") return arg;
      if (typeof arg === "object" && arg !== null) {
        return Object.entries(arg)
          .filter(([_, val]) => !!val)
          .map(([key]) => key);
      }
      return [];
    })
    .join(" ");
}
