import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  try {
    const { assetId } = await request.json();
    if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serviceClient = createServiceRoleClient();

    // Confirm asset belongs to this user's business
    const { data: asset } = await serviceClient
      .from("creative_assets")
      .select("id, business_id, file_url")
      .eq("id", assetId)
      .single();

    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const { data: business } = await serviceClient
      .from("businesses")
      .select("id")
      .eq("id", asset.business_id)
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // If stored in Supabase Storage, delete the file too
    const supabaseStoragePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/`;
    if (asset.file_url?.startsWith(supabaseStoragePrefix)) {
      const storagePath = asset.file_url.replace(supabaseStoragePrefix, "");
      await serviceClient.storage.from("assets").remove([storagePath]);
    }

    await serviceClient.from("creative_assets").delete().eq("id", assetId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Asset delete error:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
