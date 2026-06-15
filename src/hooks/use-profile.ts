"use client";

import { useEffect, useState, useCallback } from "react";
import { UserProfile } from "@/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { profileSchema } from "@/lib/validators";

// Custom event name for profile changes to sync multiple hook instances
const PROFILE_CHANGE_EVENT = "voxroom-profile-change";

/**
 * Hydration-safe helper to read the profile from localStorage.
 */
export function getStoredProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEYS.profile);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    const validated = profileSchema.safeParse(parsed);
    return validated.success ? (validated.data as UserProfile) : null;
  } catch {
    return null;
  }
}

/**
 * Hydration-safe hook to manage the user profile.
 * Synchronizes across multiple components using a custom window event.
 */
export function useProfile() {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial profile
  useEffect(() => {
    setProfileState(getStoredProfile());
    setIsLoaded(true);

    const handleProfileChange = () => {
      setProfileState(getStoredProfile());
    };

    window.addEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
    return () => {
      window.removeEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
    };
  }, []);

  // Save/Update profile
  const saveProfile = useCallback((newProfile: UserProfile): { success: boolean; error?: string } => {
    try {
      // Validate schema
      const result = profileSchema.safeParse(newProfile);
      if (!result.success) {
        const errorMsg = result.error.issues[0]?.message || "Invalid profile data";
        return { success: false, error: errorMsg };
      }

      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(result.data));
      setProfileState(result.data as UserProfile);

      // Dispatch event to sync other hook instances
      window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
      return { success: true };
    } catch (e) {
      return { success: false, error: "Failed to save profile to disk" };
    }
  }, []);

  // Delete profile
  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.profile);
    setProfileState(null);
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
  }, []);

  return {
    profile,
    isLoaded,
    hasProfile: !!profile,
    saveProfile,
    clearProfile,
  };
}
