import { NextResponse } from "next/server";
import { z } from "zod";
import { extractRecipeFromImage } from "@/lib/recipes/extract";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  imagePath: z.string().min(1),
  sourceType: z.enum(["image_meal", "image_recipe_page"]),
  mimeType: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: downloadResult, error: downloadError } = await supabase
      .storage
      .from("recipe-images")
      .download(payload.imagePath);

    if (downloadError || !downloadResult) {
      throw new Error(downloadError?.message ?? "Unable to download uploaded image.");
    }

    const imageBuffer = Buffer.from(await downloadResult.arrayBuffer());
    const base64Data = imageBuffer.toString("base64");

    const draft = await extractRecipeFromImage({
      sourceType: payload.sourceType,
      mimeType: payload.mimeType,
      base64Data,
    });

    draft.sourceImagePath = payload.imagePath;

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to extract image recipe.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
