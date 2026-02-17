import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BlackList",
    short_name: "BlackList",
    description: "Track 1v1 gaming match results",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#f97316",
    orientation: "portrait",
    dir: "rtl",
    lang: "fa",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}