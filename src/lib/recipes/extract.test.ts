import { describe, expect, it } from "vitest";
import { extractTextFromHtml, parseExtractedRecipe } from "@/lib/recipes/extract";

describe("parseExtractedRecipe", () => {
  it("normalizes non-positive ingredient quantities to a safe fallback", () => {
    const parsed = parseExtractedRecipe({
      title: "Beef Mechado",
      servings: 6,
      dietaryTags: [],
      ingredients: [
        { name: "Beef", quantity: 1, unit: "kg" },
        { name: "Soy Sauce", quantity: 0, unit: "tbsp" },
      ],
      confidence: 0.8,
    });

    expect(parsed.ingredients[0].quantity).toBe(1);
    expect(parsed.ingredients[1].quantity).toBe(1);
  });

  it("accepts numeric-like string values and normalizes servings", () => {
    const parsed = parseExtractedRecipe({
      title: "Chicken Adobo",
      servings: "0",
      dietaryTags: [],
      ingredients: [
        { name: "Chicken", quantity: "1 1/2", unit: "kg" },
        { name: "Vinegar", quantity: "1/2", unit: "cup" },
      ],
      confidence: 0.7,
    });

    expect(parsed.servings).toBe(4);
    expect(parsed.ingredients[0].quantity).toBe(1.5);
    expect(parsed.ingredients[1].quantity).toBe(0.5);
  });
});

describe("extractTextFromHtml", () => {
  it("captures ingredient-heavy metadata from social links", () => {
    const html = `
      <html>
        <head>
          <title>Video Post</title>
          <meta property="og:title" content="Arroz A La Cubana" />
          <meta property="og:image:alt" content="INGREDIENTS: - 1 onion - 2 cloves garlic - 1 tomato" />
          <link
            rel="alternate"
            type="application/json+oembed"
            title="INGREDIENTS: - 1 onion - 2 cloves garlic - 1 tomato - 1 cup peas"
          />
          <script>window.__noise = "very long script content";</script>
        </head>
        <body>
          <main>Watch this recipe video now.</main>
        </body>
      </html>
    `;

    const result = extractTextFromHtml(html);
    expect(result.title).toBe("Video Post");
    expect(result.metadataSnippets.join(" ")).toContain("INGREDIENTS");
    expect(result.metadataSnippets.join(" ")).toContain("1 cup peas");
    expect(result.text).toContain("Watch this recipe video now.");
    expect(result.text).not.toContain("window.__noise");
  });
});
