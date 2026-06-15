"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { EmojiPicker } from "@/components/onboarding/emoji-picker";
import { GENDER_OPTIONS, AGE_GROUP_OPTIONS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, saveProfile, isLoaded } = useProfile();
  
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🦁");
  const [gender, setGender] = useState<string>("");
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already onboarded, redirect to rooms list
  useEffect(() => {
    if (isLoaded && profile) {
      router.push("/rooms");
    }
  }, [isLoaded, profile, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setIsSubmitting(true);
    
    const profileData: any = {
      name: name.trim(),
      emoji,
    };
    if (gender) profileData.gender = gender;
    if (ageGroup) profileData.ageGroup = ageGroup;

    const result = saveProfile(profileData);
    
    if (result.success) {
      toast.success(`Welcome to VoxRoom, ${name.trim()}!`);
      router.push("/rooms");
    } else {
      toast.error(result.error || "Failed to save profile");
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent drop-shadow-sm">
            VoxRoom
          </h1>
          <p className="mt-3 text-muted-foreground">
            Frictionless, anonymous voice conversations.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-card rounded-3xl p-6 md:p-8 space-y-6"
        >
          {/* Large Preview Avatar */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500/20 to-cyan-500/20 text-6xl shadow-inner border border-white/10 select-none">
              {emoji}
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              Preview Identity
            </span>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <label htmlFor="display-name" className="text-sm font-medium text-muted-foreground">
              Display Name
            </label>
            <Input
              id="display-name"
              type="text"
              placeholder="e.g., Satyam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input h-12 rounded-xl text-base px-4 font-medium"
              maxLength={20}
              required
            />
          </div>

          {/* Emoji Picker Component */}
          <EmojiPicker selectedEmoji={emoji} onChange={setEmoji} />

          {/* Optional Gender Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Gender <span className="text-xs opacity-50">(Optional)</span>
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

          {/* Optional Age Group Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Age Group <span className="text-xs opacity-50">(Optional)</span>
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

          {/* Submit CTA */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-base shadow-lg shadow-violet-500/20 active-bounce mt-4"
          >
            {isSubmitting ? "Entering..." : "Enter VoxRoom"}
          </Button>
        </form>
      </div>
    </main>
  );
}
