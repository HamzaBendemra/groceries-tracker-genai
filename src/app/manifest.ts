import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Groceries for Home",
    short_name: "Groceries",
    description: "Shared grocery list with recipe ingredient imports.",
    start_url: "/groceries",
    display: "standalone",
    background_color: "#eef3fa",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
