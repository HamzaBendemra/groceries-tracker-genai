import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { env, isAnthropicConfigured, isOpenAiConfigured } from "@/lib/env";

const BaselineItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().max(100).optional().default(1),
  unit: z.string().min(1).optional().default("unit"),
});

const BaselineSuggestionSchema = z.object({
  items: z.array(BaselineItemSchema).min(1).max(30),
});

const systemPrompt = `You recommend absolute basic grocery baseline staples for a household.
Return strict JSON with this schema:
{
  "items": [
    { "name": string, "quantity": number, "unit": string }
  ]
}
Rules:
- This is for 2 adults + 1 toddler (2 years old).
- Keep only absolute basics; avoid niche/specialty ingredients.
- Prefer practical staples and short, purchase-friendly names.
- Use metric cooking units where applicable (g, kg, ml, l) or "unit".
- Keep list concise (12-18 items).
- Do not include duplicates.
- No markdown, no code block, only JSON.`;

function extractJson(input: string): unknown {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain valid JSON.");
  }

  return JSON.parse(input.slice(start, end + 1));
}

async function suggestWithOpenAi(userPrompt: string) {
  if (!isOpenAiConfigured) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey! });
  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  return response.choices[0]?.message?.content ?? "";
}

async function suggestWithAnthropic(userPrompt: string) {
  if (!isAnthropicConfigured) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey! });
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1200,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userPrompt }] as never,
      },
    ],
  });

  return message.content
    .filter((entry) => entry.type === "text")
    .map((entry) => entry.text)
    .join("\n");
}

type SuggestedBaselineItem = {
  name: string;
  quantity: number;
  unit: string;
};

export async function suggestBaselineStaples(existingItems: string[]): Promise<SuggestedBaselineItem[]> {
  const userPrompt = [
    "Recommend baseline staples now.",
    existingItems.length > 0
      ? `Existing staples to avoid repeating: ${existingItems.join(", ")}`
      : "No existing staples yet.",
  ].join("\n\n");

  let rawOutput = "";
  if (env.aiProvider === "anthropic" && isAnthropicConfigured) {
    rawOutput = await suggestWithAnthropic(userPrompt);
  } else if (isOpenAiConfigured) {
    rawOutput = await suggestWithOpenAi(userPrompt);
  } else if (isAnthropicConfigured) {
    rawOutput = await suggestWithAnthropic(userPrompt);
  } else {
    throw new Error("No LLM API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.");
  }

  const parsed = BaselineSuggestionSchema.parse(extractJson(rawOutput));
  const deduped = new Map<string, SuggestedBaselineItem>();

  for (const item of parsed.items) {
    const key = item.name.trim().toLowerCase();
    if (!key || deduped.has(key)) {
      continue;
    }

    deduped.set(key, {
      name: item.name.trim(),
      quantity: item.quantity,
      unit: item.unit.trim(),
    });
  }

  return Array.from(deduped.values());
}
