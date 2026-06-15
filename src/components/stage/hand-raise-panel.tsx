"use client";

import { useState } from "react";
import { SpeakerRequest } from "@/types";
import { getGuestId } from "@/hooks/use-guest-id";
import { Check, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface HandRaisePanelProps {
  requests: SpeakerRequest[];
  onActionComplete: () => void;
  broadcastRoleChange?: (guestId: string, newRole: any) => Promise<void>;
}

export function HandRaisePanel({ requests, onActionComplete, broadcastRoleChange }: HandRaisePanelProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (requestId: string, status: "approved" | "rejected", targetGuestId: string) => {
    setProcessingId(requestId);
    const hostGuestId = getGuestId();

    try {
      const response = await fetch("/api/speaker-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-guest-id": hostGuestId,
        },
        body: JSON.stringify({
          request_id: requestId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${status} request`);
      }

      toast.success(`Request ${status === "approved" ? "approved" : "rejected"} successfully`);
      if (status === "approved" && broadcastRoleChange) {
        await broadcastRoleChange(targetGuestId, "speaker");
      }
      onActionComplete();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 pt-4">
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <span className="text-sm font-bold text-foreground">Pending Requests</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {requests.length}
        </span>
      </div>

      <ScrollArea className="flex-1 pr-1">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/3 border border-white/5">
              <span>🤚</span>
            </div>
            <p className="text-xs italic font-medium">No pending speaker requests.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
              >
                {/* User info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-xl select-none">
                    {req.emoji}
                  </div>
                  <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                    {req.name}
                  </span>
                </div>

                {/* Approve / Reject buttons */}
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="icon"
                    disabled={processingId === req.id}
                    onClick={() => handleAction(req.id, "rejected", req.guest_id)}
                    className="h-8 w-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/20 active-bounce shrink-0"
                    title="Reject"
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    disabled={processingId === req.id}
                    onClick={() => handleAction(req.id, "approved", req.guest_id)}
                    className="h-8 w-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/20 active-bounce shrink-0"
                    title="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
