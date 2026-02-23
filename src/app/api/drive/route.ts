import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getDriveAdapter } from "@/lib/adapters/types";
import { getValidTokens } from "@/lib/oauth/tokens";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { businessId, folderId } = await request.json();
    const supabase = createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adapter = getDriveAdapter();

    // In demo mode, skip connection. In real mode, get tokens.
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      const { data: connection } = await supabase
        .from("connections")
        .select("*")
        .eq("business_id", businessId)
        .eq("platform", "google_drive")
        .single();

      if (!connection) {
        return NextResponse.json({ error: "Google Drive not connected" }, { status: 400 });
      }

      const tokens = await getValidTokens(connection);
      await adapter.connect(tokens);
    }

    const files = await adapter.listFiles(folderId || "root");

    for (const file of files) {
      const thumbnailUrl = await adapter.getThumbnailUrl(file.id);

      await supabase.from("creative_assets").upsert(
        {
          business_id: businessId,
          drive_file_id: file.id,
          file_name: file.name,
          file_type: file.mimeType.split("/")[0],
          mime_type: file.mimeType,
          thumbnail_url: thumbnailUrl,
          file_url: file.webViewLink,
          file_size: file.size,
          // Do NOT include `selected` here — preserve existing selection on re-import
        },
        { onConflict: "business_id,drive_file_id" }
      );
    }

    await supabase.from("action_logs").insert({
      business_id: businessId,
      actor: "user",
      action_type: "import_drive_assets",
      description: `Imported ${files.length} assets from Google Drive`,
    });

    return NextResponse.json({ imported: files.length });
  } catch (error) {
    console.error("Drive import error:", error);
    return NextResponse.json({ error: "Failed to import from Drive" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const businessId = url.searchParams.get("businessId");
    const parentId = url.searchParams.get("parentId") || undefined;

    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const adapter = getDriveAdapter();

    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      const supabase = createServiceRoleClient();
      const { data: connection } = await supabase
        .from("connections")
        .select("*")
        .eq("business_id", businessId)
        .eq("platform", "google_drive")
        .single();

      if (!connection) {
        return NextResponse.json({ error: "Google Drive not connected" }, { status: 400 });
      }

      const tokens = await getValidTokens(connection);
      await adapter.connect(tokens);
    }

    const folders = await adapter.listFolders(parentId);
    return NextResponse.json({ folders });
  } catch {
    return NextResponse.json({ error: "Failed to list folders" }, { status: 500 });
  }
}
