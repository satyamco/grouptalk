"use client";

import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * Hydration-safe helper to retrieve or generate a unique guest ID.
 * Synchronous version for client-only code.
 */
export function getGuestId(): string {
  if (typeof window === "undefined") return "";
  
  let guestId = localStorage.getItem(STORAGE_KEYS.guestId);
  if (!guestId) {
    guestId = `guest_${nanoid(12)}`;
    localStorage.setItem(STORAGE_KEYS.guestId, guestId);
  }
  return guestId;
}

/**
 * Hydration-safe hook for retrieving the guest ID in React components.
 */
export function useGuestId() {
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    setGuestId(getGuestId());
  }, []);

  return guestId;
}
