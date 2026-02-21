import { NextResponse } from "next/server";
import { z } from "zod";
import { extractRecipeFromUrl } from "@/lib/recipes/extract";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = schema.parse(await request.json());

    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only http/https URLs are allowed." }, { status: 400 });
    }

    const draft = await extractRecipeFromUrl(url);
    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import recipe URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
