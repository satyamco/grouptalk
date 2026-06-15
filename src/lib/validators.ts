import { z } from "zod";
import { ROOM_LIMITS, ROOM_CATEGORIES } from "./constants";

// --- Profile ---

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(ROOM_LIMITS.maxNameLength, `Max ${ROOM_LIMITS.maxNameLength} characters`),
  emoji: z.string().min(1, "Pick an avatar"),
  gender: z
    .enum(["Male", "Female", "Non-binary", "Prefer not to say"])
    .optional(),
  ageGroup: z
    .enum(["Under 18", "18-24", "25-34", "35-44", "45+"])
    .optional(),
});

// --- Room ---

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Room name is required")
    .max(ROOM_LIMITS.maxRoomNameLength, `Max ${ROOM_LIMITS.maxRoomNameLength} characters`),
  description: z
    .string()
    .max(ROOM_LIMITS.maxDescriptionLength, `Max ${ROOM_LIMITS.maxDescriptionLength} characters`)
    .optional()
    .or(z.literal("")),
  category: z.enum(ROOM_CATEGORIES as [string, ...string[]]),
  is_private: z.boolean().optional().default(false),
});

// --- Join Room ---

export const joinRoomSchema = z.object({
  guest_id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().min(1),
});

// --- Speaker Request ---

export const raiseHandSchema = z.object({
  room_id: z.string().min(1),
  guest_id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().min(1),
});

export const handleRequestSchema = z.object({
  request_id: z.string().optional(),
  room_id: z.string().optional(),
  guest_id: z.string().optional(),
  status: z.enum(["approved", "rejected"]),
});

// --- Token ---

export const tokenRequestSchema = z.object({
  roomId: z.string().min(1),
  guestId: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().min(1),
});

// --- Chat ---

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(ROOM_LIMITS.maxMessageLength, `Max ${ROOM_LIMITS.maxMessageLength} characters`),
});
