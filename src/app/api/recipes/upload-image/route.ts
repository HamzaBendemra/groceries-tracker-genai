import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("active_household_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.active_household_id) {
      return NextResponse.json({ error: "No active household found." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image file." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image exceeds 8MB limit." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExtension = ["png", "jpg", "jpeg", "webp"].includes(extension) ? extension : "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
    const path = `${profile.active_household_id}/${user.id}/${filename}`;

    const { error: uploadError } = await supabase.storage.from("recipe-images").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    return NextResponse.json({ path, mimeType: file.type });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
