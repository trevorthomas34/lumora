import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: discover images from the business website
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const businessId = url.searchParams.get("businessId");
    if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

    const serviceClient = createServiceRoleClient();
    const { data: business } = await serviceClient
      .from("businesses")
      .select("id, website_url")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!business.website_url) {
      return NextResponse.json({ error: "No website URL in your brand profile" }, { status: 400 });
    }

    const siteUrl = business.website_url.startsWith("http")
      ? business.website_url
      : `https://${business.website_url}`;

    const res = await fetch(siteUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LumoraBot/1.0; +https://lumora.ai)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Could not fetch website (${res.status})` }, { status: 502 });
    }

    const html = await res.text();
    const base = new URL(siteUrl);

    const images: { url: string; alt: string }[] = [];
    const seen = new Set<string>();
    const srcPattern = /<img[^>]+src=["']([^"']+)["'][^>]*/gi;

    let match;
    while ((match = srcPattern.exec(html)) !== null) {
      let src = match[1];
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) continue;

      try {
        src = new URL(src, base).href;
      } catch {
        continue;
      }

      // Skip obvious icons / tracking pixels
      if (/favicon|icon[-_]\d|sprite|pixel|1x1|logo[-_]sm/i.test(src)) continue;
      if (seen.has(src)) continue;
      seen.add(src);

      const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1].trim() : "";

      // Only real image extensions (or paths that look like asset dirs)
      if (!/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(src) &&
          !/\/(images?|assets?|media|photos?|uploads?)\//i.test(src)) {
        continue;
      }

      images.push({ url: src, alt });
      if (images.length >= 40) break;
    }

    return NextResponse.json({ images, websiteUrl: siteUrl });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json({ error: "Failed to fetch website" }, { status: 500 });
  }
}

// POST: save selected website images as assets
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { businessId, images } = await request.json();
    if (!businessId || !Array.isArray(images)) {
      return NextResponse.json({ error: "businessId and images required" }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: business } = await serviceClient
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      webp: "image/webp", gif: "image/gif", avif: "image/avif",
    };

    let imported = 0;
    for (const img of images as { url: string; alt: string }[]) {
      const rawName = img.url.split("/").pop()?.split("?")[0] || "website-image.jpg";
      const ext = rawName.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = img.alt || rawName;
      const mimeType = mimeMap[ext] || "image/jpeg";

      const { error } = await serviceClient.from("creative_assets").insert({
        business_id: businessId,
        file_name: fileName,
        file_type: "image",
        mime_type: mimeType,
        thumbnail_url: img.url,
        file_url: img.url,
        file_size: null,
        selected: false,
      });

      if (!error) imported++;
    }

    await serviceClient.from("action_logs").insert({
      business_id: businessId,
      actor: "user",
      action_type: "import_website_assets",
      description: `Imported ${imported} images from website`,
    });

    return NextResponse.json({ imported });
  } catch (error) {
    console.error("Website import error:", error);
    return NextResponse.json({ error: "Failed to import from website" }, { status: 500 });
  }
}
