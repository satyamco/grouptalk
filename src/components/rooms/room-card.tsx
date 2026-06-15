"use client";

import { RoomWithCounts } from "@/types";
import { CATEGORY_META } from "@/lib/constants";
import { Mic, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface RoomCardProps {
  room: RoomWithCounts;
}

export function RoomCard({ room }: RoomCardProps) {
  const router = useRouter();
  const meta = CATEGORY_META[room.category] || { icon: "💬", gradient: "from-violet-500 to-purple-600" };

  const handleJoin = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/rooms/${room.id}`);
  };

  return (
    <article 
      onClick={handleJoin}
      className="glass-card rounded-2xl p-5 flex flex-col justify-between h-48 relative overflow-hidden group cursor-pointer hover:border-violet-500/30 active:scale-[0.98] transition-all duration-300"
    >
      {/* Decorative top gradient slice based on category */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${meta.gradient}`}></div>

      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Category Badge */}
          <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/5 px-2.5 py-1 text-xs font-semibold text-foreground/85">
            <span>{meta.icon}</span>
            <span>{room.category}</span>
          </span>

          {/* Active indicator */}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              Live
            </span>
          </div>
        </div>

        {/* Room Title */}
        <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition duration-300">
          {room.name}
        </h3>
        
        {/* Room Description */}
        {room.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {room.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/40 italic">
            No description provided.
          </p>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-auto">
        {/* Host Avatar & Name */}
        <div className="flex items-center gap-2 max-w-[50%]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/5 text-base shadow-sm">
            {room.host_emoji}
          </div>
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-none">
              Host
            </span>
            <span className="text-xs font-bold text-foreground/90 truncate mt-0.5">
              {room.host_name}
            </span>
          </div>
        </div>

        {/* Counts & Action */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            {/* Speakers */}
            <div className="flex items-center gap-1" title="Speakers">
              <Mic className="h-3.5 w-3.5 text-primary/70" />
              <span className="text-xs font-bold">{room.speaker_count}</span>
            </div>
            {/* Listeners */}
            <div className="flex items-center gap-1" title="Listeners">
              <Users className="h-3.5 w-3.5 text-cyan-500/70" />
              <span className="text-xs font-bold">{room.listener_count}</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleJoin}
            className="bg-white/10 hover:bg-primary hover:text-primary-foreground border border-white/5 hover:border-transparent rounded-xl text-xs font-bold px-4 h-8 transition-all duration-300 active-bounce"
          >
            Join
          </Button>
        </div>
      </div>
    </article>
  );
}
