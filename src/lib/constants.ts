// ============================================================
// VoxRoom — Constants & Configuration
// ============================================================

import type { RoomCategory } from "@/types";

/** All available room categories */
export const ROOM_CATEGORIES: RoomCategory[] = [
  "General",
  "English Learning",
  "Music",
  "Tech",
  "Gaming",
  "Sports",
  "Politics",
  "Education",
  "Chill",
  "Q&A",
  "Debate",
];

/** Category metadata: icons & gradient colors */
export const CATEGORY_META: Record<
  RoomCategory,
  { icon: string; gradient: string }
> = {
  General: { icon: "💬", gradient: "from-violet-500 to-purple-600" },
  "English Learning": { icon: "🗣️", gradient: "from-blue-500 to-indigo-600" },
  Music: { icon: "🎵", gradient: "from-pink-500 to-rose-600" },
  Tech: { icon: "💻", gradient: "from-cyan-500 to-blue-600" },
  Gaming: { icon: "🎮", gradient: "from-emerald-500 to-green-600" },
  Sports: { icon: "⚽", gradient: "from-orange-500 to-amber-600" },
  Politics: { icon: "🏛️", gradient: "from-red-500 to-rose-600" },
  Education: { icon: "📚", gradient: "from-indigo-500 to-violet-600" },
  Chill: { icon: "🌊", gradient: "from-teal-500 to-cyan-600" },
  "Q&A": { icon: "❓", gradient: "from-yellow-500 to-orange-600" },
  Debate: { icon: "⚖️", gradient: "from-fuchsia-500 to-pink-600" },
};

/** Emoji avatar options for profile setup */
export const AVATAR_EMOJIS = [
  "😀", "😎", "🤓", "🥳", "😈", "👻", "🤖", "👽",
  "🦁", "🐯", "🦊", "🐼", "🐨", "🦄", "🐸", "🐙",
  "🌟", "🔥", "💎", "🎯", "🚀", "⚡", "🌈", "🎪",
  "🎭", "🎸", "🎧", "🎮", "📸", "🏆", "💫", "🌸",
  "🦋", "🍀", "🌺", "🎨", "🦅", "🐺", "🦇", "🐲",
];

/** Quick reaction emojis for chat */
export const QUICK_REACTIONS = ["❤️", "🔥", "👏", "😂", "💯", "🎤", "🤯", "💀"];

/** Room capacity limits */
export const ROOM_LIMITS = {
  maxSpeakers: 10,
  maxListeners: 50,
  maxNameLength: 20,
  maxRoomNameLength: 50,
  maxDescriptionLength: 200,
  maxMessageLength: 500,
} as const;

/** Gender options */
export const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
] as const;

/** Age group options */
export const AGE_GROUP_OPTIONS = [
  "Under 18",
  "18-24",
  "25-34",
  "35-44",
  "45+",
] as const;

/** localStorage keys */
export const STORAGE_KEYS = {
  profile: "voxroom-profile",
  guestId: "voxroom-guest-id",
} as const;
