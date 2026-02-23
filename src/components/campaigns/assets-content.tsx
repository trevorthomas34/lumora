"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Loader } from "@/components/shared/loader";
import { Image as ImageIcon, Check, HardDrive, Folder, FolderOpen, ChevronRight, X, RefreshCw } from "lucide-react";
import type { CreativeAsset } from "@/types";

interface DriveFolder {
  id: string;
  name: string;
  path: string;
}

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

  // Folder picker state
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<{ id: string; name: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);

  const router = useRouter();

  const isRealMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "true";

  const fetchFolders = async (parentId?: string) => {
    setLoadingFolders(true);
    setFolderError(null);
    try {
      const params = new URLSearchParams({ businessId });
      if (parentId) params.set("parentId", parentId);
      const res = await fetch(`/api/drive?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load folders");
      setFolders(data.folders || []);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : "Failed to load folders");
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleOpenFolderPicker = async () => {
    setShowFolderPicker(true);
    setFolderBreadcrumb([]);
    await fetchFolders();
  };

  const handleNavigateInto = async (folder: DriveFolder) => {
    setFolderBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
    await fetchFolders(folder.id);
  };

  const handleBreadcrumbClick = async (index: number) => {
    const newCrumb = folderBreadcrumb.slice(0, index + 1);
    setFolderBreadcrumb(newCrumb);
    const parentId = newCrumb.length > 0 ? newCrumb[newCrumb.length - 1].id : undefined;
    await fetchFolders(parentId);
  };

  const handleBreadcrumbRoot = async () => {
    setFolderBreadcrumb([]);
    await fetchFolders();
  };

  const handleSelectFolder = (folder: DriveFolder) => {
    const current = folderBreadcrumb.length > 0
      ? folderBreadcrumb[folderBreadcrumb.length - 1]
      : { id: folder.id, name: folder.name };
    setSelectedFolder({ id: folder.id, name: folder.name });
    setShowFolderPicker(false);
    // Clear breadcrumb back — the selected folder is now the active one
    void current;
  };

  const handleImportFromDrive = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, folderId: selectedFolder?.id }),
      });
      if (!res.ok) throw new Error("Failed to import");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const toggleAsset = async (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    const isSelected = newSelected.has(assetId);
    const nextSelected = !isSelected;
    if (nextSelected) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedAssets(newSelected); // optimistic update
    try {
      const res = await fetch("/api/assets/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, selected: nextSelected }),
      });
      if (!res.ok) throw new Error("Failed to save selection");
    } catch {
      // Revert optimistic update on failure
      setSelectedAssets(selectedAssets);
    }
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

        {/* Drive import controls */}
        {(driveConnected || !isRealMode) && (
          <div className="flex items-center gap-2">
            {selectedFolder ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm border border-border/50 rounded-md px-3 py-1.5 bg-muted/20">
                  <FolderOpen className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground">{selectedFolder.name}</span>
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={handleOpenFolderPicker}>
                  Change
                </Button>
                <Button size="sm" onClick={handleImportFromDrive}>
                  <HardDrive className="mr-2 h-4 w-4" /> Import from folder
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleOpenFolderPicker}>
                  <Folder className="mr-2 h-4 w-4" /> Select Drive Folder
                </Button>
                <Button variant="outline" size="sm" onClick={handleImportFromDrive}>
                  <HardDrive className="mr-2 h-4 w-4" /> Import from root
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Folder picker panel */}
      {showFolderPicker && (
        <div className="border border-border/50 rounded-lg bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <button
                onClick={handleBreadcrumbRoot}
                className="hover:text-foreground transition-colors"
              >
                My Drive
              </button>
              {folderBreadcrumb.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  <button
                    onClick={() => handleBreadcrumbClick(i)}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const parentId = folderBreadcrumb.length > 0
                    ? folderBreadcrumb[folderBreadcrumb.length - 1].id
                    : undefined;
                  fetchFolders(parentId);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setShowFolderPicker(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loadingFolders ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading folders...
            </div>
          ) : folderError ? (
            <p className="text-sm text-destructive">{folderError}</p>
          ) : folders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No folders found at this level.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {folders.map((folder) => (
                <div key={folder.id} className="flex flex-col gap-1">
                  <button
                    onClick={() => handleSelectFolder(folder)}
                    className="flex items-center gap-2 p-2.5 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                  >
                    <Folder className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-sm truncate">{folder.name}</span>
                  </button>
                  <button
                    onClick={() => handleNavigateInto(folder)}
                    className="text-[10px] text-muted-foreground hover:text-primary text-center transition-colors"
                  >
                    Browse subfolders →
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Click a folder to select it for import, or &quot;Browse subfolders&quot; to navigate inside.
          </p>
        </div>
      )}

      {assets.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No Assets Yet"
          description={
            driveConnected
              ? "Select a Drive folder and import images or videos to use in your campaigns."
              : "Connect Google Drive in Settings to import your creative assets."
          }
          actionLabel={driveConnected ? "Select Drive Folder" : "Go to Settings"}
          onAction={driveConnected ? handleOpenFolderPicker : () => router.push("/settings")}
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
                      // eslint-disable-next-line @next/next/no-img-element
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
