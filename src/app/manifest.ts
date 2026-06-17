import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VoxRoom — Frictionless Social Audio",
    short_name: "VoxRoom",
    description: "Frictionless, anonymous voice conversations. Create rooms, participate, and chat in real-time.",
    start_url: "/rooms",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f111a",
    theme_color: "#0f111a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
