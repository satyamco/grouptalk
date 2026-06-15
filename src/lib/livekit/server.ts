import { AccessToken } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

/**
 * Generate a JWT token for joining a LiveKit room.
 * 
 * @param roomId - The room identifier to join
 * @param identity - The user's unique guest ID
 * @param name - The user's display name
 * @param emoji - The user's avatar emoji (stored in token metadata)
 * @param role - The user's role ('host' | 'moderator' | 'speaker' | 'listener')
 */
export async function generateLiveKitToken(
  roomId: string,
  identity: string,
  name: string,
  emoji: string,
  role: "host" | "moderator" | "speaker" | "listener"
): Promise<string> {
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit API credentials are not configured on the server.");
  }

  // Determine permissions based on role
  const canPublish = role === "host" || role === "moderator" || role === "speaker";
  
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({ emoji, role }),
  });

  token.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: canPublish,
    canSubscribe: true,
    canPublishData: true, // Allow data channels for real-time chat/reactions
  });

  return await token.toJwt();
}
