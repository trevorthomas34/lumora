"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Loader } from "@/components/shared/loader";
import { Image as ImageIcon, Check, HardDrive } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CreativeAsset } from "@/types";

interface AssetsContentProps {
  businessId: string;
  assets: CreativeAsset[];
  driveConnected: boolean;
}

export function AssetsContent({ businessId, assets, driveConnected }: AssetsContentProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(
    new Set(assets.filter((a) => a.selected).map((a) => a.id))
  );
  const router = useRouter();
  const supabase = createClient();

  const handleImportFromDrive = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId }) });
      if (!res.ok) throw new Error("Failed to import");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const toggleAsset = async (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    const isSelected = newSelected.has(assetId);
    if (isSelected) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);

    await supabase
      .from("creative_assets")
      .update({ selected: !isSelected })
      .eq("id", assetId);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader size="lg" text="Importing assets from Google Drive..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Creative Assets</h2>
          <p className="text-sm text-muted-foreground">
            {selectedAssets.size} of {assets.length} assets selected for campaigns
          </p>
        </div>
        <Button variant="outline" onClick={handleImportFromDrive} disabled={!driveConnected && process.env.NEXT_PUBLIC_DEMO_MODE !== "true"}>
          <HardDrive className="mr-2 h-4 w-4" /> Import from Drive
        </Button>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No Assets Yet"
          description={driveConnected
            ? "Import images and videos from your Google Drive to use in campaigns."
            : "Connect Google Drive in Settings to import your creative assets."
          }
          actionLabel={driveConnected ? "Import from Drive" : "Go to Settings"}
          onAction={driveConnected ? handleImportFromDrive : () => router.push("/settings")}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => {
            const isSelected = selectedAssets.has(asset.id);
            return (
              <Card
                key={asset.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  isSelected ? "border-primary ring-1 ring-primary/30" : ""
                }`}
                onClick={() => toggleAsset(asset.id)}
              >
                <CardContent className="p-3">
                  <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center relative overflow-hidden">
                    {asset.thumbnail_url ? (
                      <img
                        src={asset.thumbnail_url}
                        alt={asset.file_name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{asset.file_name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{formatFileSize(asset.file_size)}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {asset.file_type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
