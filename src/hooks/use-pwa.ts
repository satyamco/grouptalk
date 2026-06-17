"use client";

import { useState, useEffect } from "react";

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the app is running in standalone mode (installed)
    const isStandaloneMode = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = async () => {
    if (!installPrompt) return false;

    // Show the native install prompt
    installPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === "accepted") {
      setInstallPrompt(null);
      return true;
    }
    
    return false;
  };

  return {
    showInstallPrompt: !!installPrompt,
    isIOS,
    isStandalone,
    triggerInstall,
  };
}
