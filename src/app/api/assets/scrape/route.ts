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

    // Resolve and normalize an image URL — strip WordPress size suffixes to get originals
    const resolveUrl = (raw: string): string | null => {
      if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return null;
      try {
        let url = new URL(raw, base).href;
        // Strip WordPress size suffix: image-800x600.jpg → image.jpg
        url = url.replace(/(-\d+x\d+)(\.[a-z]{2,5})(\?|$)/i, "$2$3");
        return url;
      } catch {
        return null;
      }
    };

    // Pick the largest URL from a srcset string
    const bestFromSrcset = (srcset: string): string | null => {
      const candidates = srcset.split(",").map((s) => {
        const parts = s.trim().split(/\s+/);
        const url = parts[0];
        const w = parts[1] ? parseInt(parts[1]) : 0;
        return { url, w };
      });
      candidates.sort((a, b) => b.w - a.w);
      return candidates[0]?.url || null;
    };

    const images: { url: string; alt: string }[] = [];
    const seen = new Set<string>();

    const addImage = (src: string, alt: string) => {
      if (/favicon|icon[-_]\d|sprite|pixel|1x1|logo[-_]sm/i.test(src)) return;
      if (!/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(src) &&
          !/\/(images?|assets?|media|photos?|uploads?)\//i.test(src)) return;
      if (seen.has(src)) return;
      seen.add(src);
      images.push({ url: src, alt });
    };

    const imgPattern = /<img([^>]+)>/gi;
    let match;
    while ((match = imgPattern.exec(html)) !== null) {
      if (images.length >= 40) break;
      const attrs = match[1];

      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1].trim() : "";

      // Prefer srcset (higher-res) over src
      const srcsetMatch = attrs.match(/srcset=["']([^"']+)["']/i);
      if (srcsetMatch) {
        const best = bestFromSrcset(srcsetMatch[1]);
        if (best) {
          const url = resolveUrl(best);
          if (url) { addImage(url, alt); continue; }
        }
      }

      // Check lazy-load attributes before src — lazy loaders put real URL here
      const lazyMatch = attrs.match(/data-(?:src|lazy|lazy-src|original|full-url|large-file-src|srcset)=["']([^"']+)["']/i);
      if (lazyMatch) {
        const val = lazyMatch[1];
        // Could be a srcset string or a plain URL
        const url = resolveUrl(val.includes(" ") ? (bestFromSrcset(val) || val) : val);
        if (url) { addImage(url, alt); continue; }
      }

      const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const url = resolveUrl(srcMatch[1]);
        if (url) addImage(url, alt);
      }
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
