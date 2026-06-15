"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { getGuestId } from "@/hooks/use-guest-id";
import { ROOM_CATEGORIES, CATEGORY_META } from "@/lib/constants";
import { createRoomSchema } from "@/lib/validators";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateRoomFormProps {
  onSuccess?: (roomId: string) => void;
  onCancel?: () => void;
}

export function CreateRoomForm({ onSuccess, onCancel }: CreateRoomFormProps) {
  const router = useRouter();
  const { profile } = useProfile();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error("You must set up a profile first");
      return;
    }

    // Prepare payload
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      is_private: isPrivate,
    };

    // Client-side validation
    const validation = createRoomSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || "Validation failed");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          host: {
            guestId: getGuestId(),
            name: profile.name,
            emoji: profile.emoji,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create room");
      }

      toast.success("Room created successfully!");
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.push(`/rooms/${data.id}`);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Room Name */}
      <div className="space-y-1.5">
        <label htmlFor="room-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Room Name
        </label>
        <Input
          id="room-name"
          type="text"
          placeholder="What are we talking about?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="glass-input h-11 rounded-xl font-medium"
          maxLength={50}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="room-desc" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Description <span className="opacity-50 text-[10px]">(Optional)</span>
        </label>
        <textarea
          id="room-desc"
          placeholder="Write a brief description of the topic..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={200}
          className="w-full rounded-xl border border-border/80 bg-white/3 p-3 text-sm text-foreground placeholder-muted-foreground glass-input resize-none focus:outline-none"
        />
      </div>

      {/* Category Select Dropdown */}
      <div className="space-y-1.5">
        <label htmlFor="create-room-category" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Category
        </label>
        <div className="relative">
          <select
            id="create-room-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-xl bg-[#0d0e14] border border-white/10 text-foreground font-bold text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer active:scale-[0.99] transition-all"
          >
            {ROOM_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              return (
                <option key={cat} value={cat}>
                  {meta.icon} &nbsp;{cat}
                </option>
              );
            })}
          </select>
          
          {/* Custom chevron dropdown arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Visibility Toggle */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Visibility
        </label>
        <div className="flex gap-2">
          {/* Public Option */}
          <button
            type="button"
            onClick={() => setIsPrivate(false)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition duration-200 text-xs font-bold active-bounce",
              !isPrivate
                ? "bg-primary/25 border-primary text-primary"
                : "bg-white/3 border-white/5 text-muted-foreground hover:bg-white/5"
            )}
          >
            <Globe className="h-4 w-4" />
            <div className="flex flex-col items-start text-left">
              <span>Public</span>
              <span className="text-[10px] text-muted-foreground font-normal leading-tight mt-0.5">Visible in discover list</span>
            </div>
          </button>

          {/* Private Option */}
          <button
            type="button"
            onClick={() => setIsPrivate(true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition duration-200 text-xs font-bold active-bounce",
              isPrivate
                ? "bg-primary/25 border-primary text-primary"
                : "bg-white/3 border-white/5 text-muted-foreground hover:bg-white/5"
            )}
          >
            <Lock className="h-4 w-4" />
            <div className="flex flex-col items-start text-left">
              <span>Private</span>
              <span className="text-[10px] text-muted-foreground font-normal leading-tight mt-0.5">Invite link only</span>
            </div>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-3">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex-1 rounded-xl h-11"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl h-11 shadow-lg shadow-violet-500/20 active-bounce"
        >
          {isSubmitting ? "Creating..." : "Create Room"}
        </Button>
      </div>
    </form>
  );
}
