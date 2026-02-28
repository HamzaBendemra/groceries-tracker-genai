import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { parse } from "node-html-parser";
import { z } from "zod";
import { env, isAnthropicConfigured, isOpenAiConfigured } from "@/lib/env";
import type { RecipeSourceType, RecipeDraft } from "@/lib/data/types";
import { normalizeIngredientName } from "@/lib/ingredients/normalize";
import { toTitleCase } from "@/lib/ingredients/title-case";
import { normalizeUnit } from "@/lib/ingredients/units";

function parseNumericLike(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const input = value.trim();
  if (!input) {
    return null;
  }

  const mixedFractionMatch = input.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1]);
    const numerator = Number(mixedFractionMatch[2]);
    const denominator = Number(mixedFractionMatch[3]);
    if (denominator !== 0) {
      return whole + numerator / denominator;
    }
  }

  const fractionMatch = input.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator !== 0) {
      return numerator / denominator;
    }
  }

  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSafePositive(value: unknown, fallback: number): number {
  const parsed = parseNumericLike(value);
  return parsed !== null && parsed > 0 ? parsed : fallback;
}

const IngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.union([z.number(), z.string(), z.null()]).optional().transform((value) => toSafePositive(value, 1)),
  unit: z.string().default("unit"),
  optional: z.boolean().default(false),
  notes: z.string().optional(),
});

const ExtractedRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  servings: z.union([z.number(), z.string(), z.null()]).optional().transform((value) => toSafePositive(value, 4)),
  dietaryTags: z.array(z.string()).default([]),
  ingredients: z.array(IngredientSchema).min(1),
  confidence: z.number().min(0).max(1).default(0.65),
});

export function parseExtractedRecipe(input: unknown): z.infer<typeof ExtractedRecipeSchema> {
  return ExtractedRecipeSchema.parse(input);
}

const systemPrompt = `You extract structured recipe data for grocery planning.
Return strict JSON with this schema:
{
  "title": string,
  "description": string,
  "servings": number,
  "dietaryTags": string[],
  "ingredients": [
    {"name": string, "quantity": number, "unit": string, "optional": boolean, "notes": string}
  ],
  "confidence": number
}
Rules:
- Estimate missing quantities conservatively and include low confidence when uncertain.
- If metadata or structured data contains an explicit ingredient list, include all of those ingredients.
- Use common grocery units only.
- Keep ingredient names short and purchase-friendly.
- No markdown, no code block, only JSON.`;

function extractJson(input: string): unknown {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain valid JSON.");
  }

  return JSON.parse(input.slice(start, end + 1));
}

function toRecipeDraft(parsed: z.infer<typeof ExtractedRecipeSchema>, sourceType: RecipeSourceType): RecipeDraft {
  return {
    title: parsed.title,
    description: parsed.description ?? null,
    sourceType,
    servings: parsed.servings,
    dietaryTags: parsed.dietaryTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    confidence: parsed.confidence,
    ingredients: parsed.ingredients.map((ingredient) => {
      const displayName = toTitleCase(ingredient.name.trim());
      return {
        nameDisplay: displayName,
        nameNormalized: normalizeIngredientName(displayName),
        quantity: ingredient.quantity,
        unit: normalizeUnit(ingredient.unit),
        isOptional: ingredient.optional,
        notes: ingredient.notes ?? null,
      };
    }),
  };
}

function normalizeSnippet(input: string, maxLength: number): string {
  return input.replace(/\s+/g, " ").replaceAll("\u00a0", " ").trim().slice(0, maxLength);
}

function addSnippet(target: string[], value: string | null | undefined, maxLength = 2500) {
  if (!value) {
    return;
  }

  const normalized = normalizeSnippet(value, maxLength);
  if (!normalized || target.includes(normalized)) {
    return;
  }

  target.push(normalized);
}

function collectStructuredRecipeSnippets(node: unknown, snippets: string[]) {
  if (Array.isArray(node)) {
    node.forEach((entry) => collectStructuredRecipeSnippets(entry, snippets));
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  const record = node as Record<string, unknown>;
  const typeValue = record["@type"];
  const typeText = Array.isArray(typeValue) ? typeValue.join(",").toLowerCase() : String(typeValue ?? "").toLowerCase();
  const looksLikeRecipe = typeText.includes("recipe") || "recipeIngredient" in record;

  if (looksLikeRecipe) {
    const lines: string[] = [];
    if (typeof record.name === "string") {
      lines.push(`Name: ${record.name}`);
    }
    if (typeof record.description === "string") {
      lines.push(`Description: ${record.description}`);
    }

    if (Array.isArray(record.recipeIngredient)) {
      lines.push(`Ingredients: ${record.recipeIngredient.map((entry) => String(entry)).join(" | ")}`);
    }

    const instructions = record.recipeInstructions;
    if (Array.isArray(instructions)) {
      const steps = instructions
        .map((entry) => {
          if (typeof entry === "string") {
            return entry;
          }
          if (entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).text === "string") {
            return (entry as Record<string, unknown>).text as string;
          }
          return "";
        })
        .filter(Boolean);
      if (steps.length > 0) {
        lines.push(`Instructions: ${steps.join(" | ")}`);
      }
    }

    if (typeof instructions === "string") {
      lines.push(`Instructions: ${instructions}`);
    }

    addSnippet(snippets, lines.join("\n"), 4000);
  }

  Object.values(record).forEach((entry) => collectStructuredRecipeSnippets(entry, snippets));
}

export function extractTextFromHtml(html: string): {
  title?: string;
  description?: string;
  text: string;
  metadataSnippets: string[];
} {
  const root = parse(html);
  const title = root.querySelector("title")?.text.trim();
  const description =
    root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ??
    root.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim() ??
    root.querySelector('meta[name="twitter:description"]')?.getAttribute("content")?.trim();

  const metadataSnippets: string[] = [];
  [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
    'meta[property="og:image:alt"]',
  ].forEach((selector) => {
    addSnippet(metadataSnippets, root.querySelector(selector)?.getAttribute("content"));
  });

  root.querySelectorAll('link[rel="alternate"][type*="oembed"]').forEach((node) => {
    addSnippet(metadataSnippets, node.getAttribute("title"), 4000);
  });

  root.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
    const content = node.text.trim();
    if (!content) {
      return;
    }

    try {
      collectStructuredRecipeSnippets(JSON.parse(content), metadataSnippets);
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  const cleanedRoot = parse(html);
  cleanedRoot.querySelectorAll("script,style,noscript,template,svg").forEach((node) => node.remove());

  const textSnippets: string[] = [];
  [
    cleanedRoot.querySelector("article"),
    cleanedRoot.querySelector("main"),
    cleanedRoot.querySelector('[role="main"]'),
    cleanedRoot.querySelector("body"),
  ]
    .filter(Boolean)
    .forEach((node) => {
      addSnippet(textSnippets, node?.textContent ?? "", 12000);
    });

  return {
    title,
    description,
    text: textSnippets.join("\n\n").slice(0, 12000).trim(),
    metadataSnippets: metadataSnippets.slice(0, 8),
  };
}

async function extractWithOpenAi(userPrompt: string, image?: { mimeType: string; base64Data: string }): Promise<string> {
  if (!isOpenAiConfigured) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey! });
  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: image
          ? [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${image.mimeType};base64,${image.base64Data}`,
                },
              },
            ]
          : userPrompt,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  return response.choices[0]?.message?.content ?? "";
}

async function extractWithAnthropic(userPrompt: string, image?: { mimeType: string; base64Data: string }): Promise<string> {
  if (!isAnthropicConfigured) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey! });
  const content: Array<Record<string, unknown>> = [{ type: "text", text: userPrompt }];

  if (image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mimeType,
        data: image.base64Data,
      },
    });
  }

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1500,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: content as never,
      },
    ],
  });

  return message.content
    .filter((entry) => entry.type === "text")
    .map((entry) => entry.text)
    .join("\n");
}

async function extractWithConfiguredProvider(args: {
  userPrompt: string;
  image?: { mimeType: string; base64Data: string };
}) {
  if (env.aiProvider === "anthropic") {
    return extractWithAnthropic(args.userPrompt, args.image);
  }

  return extractWithOpenAi(args.userPrompt, args.image);
}

export async function extractRecipeFromUrl(url: string): Promise<RecipeDraft> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; GroceriesTrackerBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch recipe URL (${response.status}).`);
  }

  const html = await response.text();
  const extracted = extractTextFromHtml(html);

  const userPrompt = [
    `Source URL: ${url}`,
    extracted.title ? `Page title: ${extracted.title}` : "",
    extracted.description ? `Page description: ${extracted.description}` : "",
    extracted.metadataSnippets.length > 0
      ? `Metadata and structured hints: ${extracted.metadataSnippets
          .map((snippet, index) => `[${index + 1}] ${snippet}`)
          .join("\n\n")}`
      : "",
    `Page text snippet: ${extracted.text}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const modelOutput = await extractWithConfiguredProvider({
    userPrompt,
  });

  const parsed = parseExtractedRecipe(extractJson(modelOutput));
  const recipe = toRecipeDraft(parsed, "url");
  recipe.sourceUrl = url;
  return recipe;
}

export async function extractRecipeFromImage(args: {
  mimeType: string;
  base64Data: string;
  sourceType: Extract<RecipeSourceType, "image_meal" | "image_recipe_page">;
}): Promise<RecipeDraft> {
  const userPrompt =
    args.sourceType === "image_meal"
      ? "Infer the most likely recipe and ingredients from this meal photo. Keep confidence low unless obvious."
      : "Extract the recipe from this photographed cookbook or recipe page.";

  const modelOutput = await extractWithConfiguredProvider({
    userPrompt,
    image: { mimeType: args.mimeType, base64Data: args.base64Data },
  });

  return toRecipeDraft(parseExtractedRecipe(extractJson(modelOutput)), args.sourceType);
}
