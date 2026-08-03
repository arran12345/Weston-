import type { MetadataRoute } from "next";

/**
 * Makes the app installable to a phone's home screen. It still talks to
 * whichever machine runs the server — this changes how it's launched and
 * framed, not where the data lives (docs/PRD.md Section 7).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finance OS",
    short_name: "Finance OS",
    description: "Net worth first. Everything else is an input to it.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
