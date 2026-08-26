import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BodhAI — Intelligence, Made Understandable",
    short_name: "BodhAI",
    description: "Modern, open-source AI assistant designed to help you think, learn, create, and solve.",
    start_url: "/chat",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/logo/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
