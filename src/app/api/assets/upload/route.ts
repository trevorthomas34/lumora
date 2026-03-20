import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const businessId = formData.get("businessId") as string | null;

    if (!file || !businessId) {
      return NextResponse.json({ error: "file and businessId required" }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Verify business ownership
    const { data: business } = await serviceClient
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = `${businessId}/${safeName}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await serviceClient.storage
      .from("assets")
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from("assets")
      .getPublicUrl(storagePath);

    const fileType = file.type.split("/")[0]; // "image" or "video"

    const { data: asset, error: dbError } = await serviceClient
      .from("creative_assets")
      .insert({
        business_id: businessId,
        file_name: file.name,
        file_type: fileType,
        mime_type: file.type,
        thumbnail_url: fileType === "image" ? publicUrl : null,
        file_url: publicUrl,
        file_size: file.size,
        selected: false,
      })
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
