import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HomeCart AI",
    short_name: "HomeCart",
    description: "Collaborative grocery app for families: staples, recipes, and one-tap list building.",
    start_url: "/groceries",
    display: "standalone",
    background_color: "#eef3fa",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
