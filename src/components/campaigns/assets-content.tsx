"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Loader } from "@/components/shared/loader";
import {
  Image as ImageIcon,
  Check,
  HardDrive,
  Folder,
  FolderOpen,
  ChevronRight,
  X,
  RefreshCw,
  Upload,
  Globe,
  Play,
  ExternalLink,
} from "lucide-react";
import type { CreativeAsset } from "@/types";

interface DriveFolder {
  id: string;
  name: string;
  path: string;
}

interface ScrapedImage {
  url: string;
  alt: string;
}

interface AssetsContentProps {
  businessId: string;
  assets: CreativeAsset[];
  driveConnected: boolean;
  websiteUrl: string | null;
}

export function AssetsContent({ businessId, assets: initialAssets, driveConnected, websiteUrl }: AssetsContentProps) {
  const [assets, setAssets] = useState<CreativeAsset[]>(initialAssets);
  const [loading, setLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(
    new Set(initialAssets.filter((a) => a.selected).map((a) => a.id))
  );

  // Folder picker state
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<{ id: string; name: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Preview modal state
  const [previewAsset, setPreviewAsset] = useState<CreativeAsset | null>(null);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  // Website scrape state
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [scrapeSelected, setScrapeSelected] = useState<Set<number>>(new Set());
  const [scrapeImporting, setScrapeImporting] = useState(false);

  const router = useRouter();
  const isRealMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "true";

  // ── Drive ─────────────────────────────────────────────────────────────────

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
    await fetchFolders(newCrumb[newCrumb.length - 1].id);
  };

  const handleBreadcrumbRoot = async () => {
    setFolderBreadcrumb([]);
    await fetchFolders();
  };

  const handleSelectFolder = (folder: DriveFolder) => {
    setSelectedFolder({ id: folder.id, name: folder.name });
    setShowFolderPicker(false);
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

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleAsset = useCallback(async (assetId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isSelected = selectedAssets.has(assetId);
    const nextSelected = !isSelected;
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      nextSelected ? next.add(assetId) : next.delete(assetId);
      return next;
    });
    try {
      const res = await fetch("/api/assets/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, selected: nextSelected }),
      });
      if (!res.ok) throw new Error("Failed to save selection");
    } catch {
      // Revert on failure
      setSelectedAssets((prev) => {
        const next = new Set(prev);
        isSelected ? next.add(assetId) : next.delete(assetId);
        return next;
      });
    }
  }, [selectedAssets]);

  // ── Local Upload ──────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    const newAssets: CreativeAsset[] = [];
    for (let i = 0; i < files.length; i++) {
      const form = new FormData();
      form.append("file", files[i]);
      form.append("businessId", businessId);
      try {
        const res = await fetch("/api/assets/upload", { method: "POST", body: form });
        const data = await res.json();
        if (res.ok && data.asset) newAssets.push(data.asset);
      } catch {
        // continue on individual failure
      }
      setUploadProgress({ done: i + 1, total: files.length });
    }

    setAssets((prev) => [...newAssets, ...prev]);
    setUploading(false);
    setUploadProgress(null);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  // ── Website Scrape ────────────────────────────────────────────────────────

  const handleOpenScrape = async () => {
    setShowScrapeModal(true);
    setScrapeError(null);
    setScrapeLoading(true);
    setScrapeSelected(new Set());
    try {
      const res = await fetch(`/api/assets/scrape?businessId=${businessId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch website");
      setScrapedImages(data.images || []);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Failed to fetch website");
    } finally {
      setScrapeLoading(false);
    }
  };

  const toggleScrapeImage = (index: number) => {
    setScrapeSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const handleImportFromWebsite = async () => {
    const toImport = Array.from(scrapeSelected).map((i) => scrapedImages[i]);
    if (!toImport.length) return;
    setScrapeImporting(true);
    try {
      const res = await fetch("/api/assets/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, images: toImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setShowScrapeModal(false);
      router.refresh();
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setScrapeImporting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Loading overlay ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader size="lg" text="Importing assets from Google Drive..." />
      </div>
    );
  }

  if (uploading && uploadProgress) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader size="lg" text={`Uploading ${uploadProgress.done} / ${uploadProgress.total}...`} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Creative Assets</h2>
            <p className="text-sm text-muted-foreground">
              {selectedAssets.size} of {assets.length} assets selected for campaigns
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Upload from device */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>

            {/* From website */}
            {websiteUrl && (
              <Button variant="outline" size="sm" onClick={handleOpenScrape}>
                <Globe className="mr-2 h-4 w-4" /> From Website
              </Button>
            )}

            {/* Google Drive */}
            {(driveConnected || !isRealMode) && (
              <>
                {selectedFolder ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm border border-border/50 rounded-md px-3 py-1.5 bg-muted/20">
                      <FolderOpen className="h-3.5 w-3.5 text-primary" />
                      <span>{selectedFolder.name}</span>
                      <button onClick={() => setSelectedFolder(null)} className="ml-1 text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenFolderPicker}>Change</Button>
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
              </>
            )}
          </div>
        </div>

        {/* Drive folder picker */}
        {showFolderPicker && (
          <div className="border border-border/50 rounded-lg bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <button onClick={handleBreadcrumbRoot} className="hover:text-foreground transition-colors">
                  My Drive
                </button>
                {folderBreadcrumb.map((crumb, i) => (
                  <span key={crumb.id} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3" />
                    <button onClick={() => handleBreadcrumbClick(i)} className="hover:text-foreground transition-colors">
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const parentId = folderBreadcrumb.length > 0 ? folderBreadcrumb[folderBreadcrumb.length - 1].id : undefined;
                    fetchFolders(parentId);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setShowFolderPicker(false)} className="text-muted-foreground hover:text-foreground">
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
                      className="flex items-center gap-2 p-2.5 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
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

        {/* Asset grid */}
        {assets.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No Assets Yet"
            description={
              driveConnected
                ? "Select a Drive folder and import images or videos, or upload from your device."
                : "Upload from your device, or connect Google Drive in Settings to import assets."
            }
            actionLabel="Upload Files"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map((asset) => {
              const isSelected = selectedAssets.has(asset.id);
              const isVideo = asset.file_type === "video";
              return (
                <Card
                  key={asset.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    isSelected ? "border-primary ring-1 ring-primary/30" : ""
                  }`}
                  onClick={() => setPreviewAsset(asset)}
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

                      {/* Video indicator */}
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="bg-black/60 rounded-full p-2">
                            <Play className="h-5 w-5 text-white fill-white" />
                          </div>
                        </div>
                      )}

                      {/* Selection toggle — separate hit target */}
                      <button
                        onClick={(e) => toggleAsset(asset.id, e)}
                        className={`absolute top-2 right-2 rounded-full p-1 transition-colors ${
                          isSelected
                            ? "bg-primary"
                            : "bg-black/40 hover:bg-black/60"
                        }`}
                      >
                        <Check className={`h-3 w-3 ${isSelected ? "text-white" : "text-white/60"}`} />
                      </button>
                    </div>
                    <p className="text-sm font-medium truncate">{asset.file_name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{formatFileSize(asset.file_size) ?? ""}</span>
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

      {/* ── Preview Modal ──────────────────────────────────────────────────── */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="relative bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">{previewAsset.file_name}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">{previewAsset.file_type}</Badge>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                {previewAsset.file_url && (
                  <a
                    href={previewAsset.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    title="Open original"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button onClick={() => setPreviewAsset(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/20 min-h-0">
              {previewAsset.file_type === "video" ? (
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  {previewAsset.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewAsset.thumbnail_url}
                      alt={previewAsset.file_name}
                      className="max-h-64 rounded-lg object-contain"
                    />
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <Play className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Video preview is not available inline.</p>
                    {previewAsset.file_url && (
                      <a
                        href={previewAsset.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Open video <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ) : previewAsset.file_url || previewAsset.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewAsset.file_url || previewAsset.thumbnail_url || ""}
                  alt={previewAsset.file_name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : (
                <div className="p-12 text-muted-foreground">
                  <ImageIcon className="h-16 w-16 mx-auto mb-2" />
                  <p className="text-sm">No preview available</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">{formatFileSize(previewAsset.file_size) ?? "Size unknown"}</span>
              <Button
                size="sm"
                variant={selectedAssets.has(previewAsset.id) ? "default" : "outline"}
                onClick={(e) => toggleAsset(previewAsset.id, e)}
              >
                <Check className="mr-2 h-4 w-4" />
                {selectedAssets.has(previewAsset.id) ? "Selected for campaigns" : "Select for campaigns"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Website Scrape Modal ───────────────────────────────────────────── */}
      {showScrapeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => !scrapeImporting && setShowScrapeModal(false)}
        >
          <div
            className="relative bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div>
                <h3 className="font-semibold">Import from Website</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{websiteUrl}</p>
              </div>
              <button
                onClick={() => !scrapeImporting && setShowScrapeModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 min-h-0">
              {scrapeLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader size="lg" text="Scanning website for images..." />
                </div>
              ) : scrapeError ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <p className="text-sm text-destructive">{scrapeError}</p>
                </div>
              ) : scrapedImages.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No images found on the website.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Found {scrapedImages.length} images. Select the ones you want to import.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {scrapedImages.map((img, i) => {
                      const isSel = scrapeSelected.has(i);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleScrapeImage(i)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                            isSel ? "border-primary ring-1 ring-primary/30" : "border-border/50 hover:border-primary/40"
                          }`}
                        >
                          <div className="aspect-square bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.alt || ""}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                          {isSel && (
                            <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-1">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {img.alt && (
                            <p className="text-[10px] text-muted-foreground truncate px-1.5 py-1">{img.alt}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!scrapeLoading && !scrapeError && scrapedImages.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {scrapeSelected.size} selected
                  </span>
                  <button
                    onClick={() => setScrapeSelected(new Set(scrapedImages.map((_, i) => i)))}
                    className="text-xs text-primary hover:underline"
                  >
                    Select all
                  </button>
                  {scrapeSelected.size > 0 && (
                    <button
                      onClick={() => setScrapeSelected(new Set())}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={scrapeSelected.size === 0 || scrapeImporting}
                  onClick={handleImportFromWebsite}
                >
                  {scrapeImporting ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" />
                  )}
                  Import {scrapeSelected.size > 0 ? scrapeSelected.size : ""} image{scrapeSelected.size !== 1 ? "s" : ""}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
