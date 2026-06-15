"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/use-profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/onboarding/emoji-picker";
import { GENDER_OPTIONS, AGE_GROUP_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ isOpen, onOpenChange }: ProfileDialogProps) {
  const { profile, saveProfile } = useProfile();
  
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🦁");
  const [gender, setGender] = useState<string>("");
  const [ageGroup, setAgeGroup] = useState<string>("");

  // Populate state when dialog opens or profile loads
  useEffect(() => {
    if (isOpen && profile) {
      setName(profile.name);
      setEmoji(profile.emoji);
      setGender(profile.gender || "");
      setAgeGroup(profile.ageGroup || "");
    }
  }, [isOpen, profile]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    const updated: any = { name: name.trim(), emoji };
    if (gender) updated.gender = gender;
    if (ageGroup) updated.ageGroup = ageGroup;

    const result = saveProfile(updated);
    if (result.success) {
      toast.success("Profile updated!");
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to update profile");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-white/10 text-foreground w-[92vw] sm:max-w-sm md:max-w-md lg:max-w-lg rounded-2xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Edit Profile
          </DialogTitle>
          <DialogDescription className="sr-only">
            Update your display name, avatar emoji, gender, and age group details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 pt-2">
          <div className="flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500/20 to-cyan-500/20 text-5xl border border-white/10 shadow-inner select-none">
              {emoji}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Display Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input h-10 rounded-xl"
              maxLength={20}
              required
            />
          </div>

          <EmojiPicker selectedEmoji={emoji} onChange={setEmoji} />

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Gender
            </label>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGender(gender === option ? "" : option)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all active-bounce",
                    gender === option
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Age Group
            </label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUP_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAgeGroup(ageGroup === option ? "" : option)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all active-bounce",
                    ageGroup === option
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 hover:bg-white/5 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 active-bounce"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
