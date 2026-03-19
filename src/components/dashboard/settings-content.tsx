"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/utils";
import type { Business, Connection } from "@/types";
import { Save, Link2, Unlink, Sparkles, Loader2, X, AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { getOAuthError } from "@/lib/oauth/errors";
import { BUSINESS_GOALS, BRAND_TONES, LOCATION_PRESETS, US_STATE_PRESETS, AGE_RANGES, GENDER_OPTIONS } from "@/lib/constants";

type Competitor = { name: string; url: string };

interface AdAccount {
  id: string;
  name: string;
}

interface SettingsContentProps {
  business: Business;
  connections: Pick<Connection, "id" | "platform" | "status" | "platform_account_id" | "platform_account_name" | "pixel_id" | "updated_at">[];
}

export function SettingsContent({ business, connections }: SettingsContentProps) {
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[] | null>(null);
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(false);
  const [savingAdAccount, setSavingAdAccount] = useState(false);
  const [savingPixelId, setSavingPixelId] = useState(false);
  const [name, setName] = useState(business.name);
  const [dailyBudget, setDailyBudget] = useState(business.daily_budget?.toString() || "");
  const [monthlyBudget, setMonthlyBudget] = useState(business.monthly_budget?.toString() || "");

  // Brand profile state
  const [savingProfile, setSavingProfile] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(business.website_url || "");
  const [offerDescription, setOfferDescription] = useState(business.offer_description || "");
  const [goal, setGoal] = useState(business.goal || "");
  const [selectedTones, setSelectedTones] = useState<string[]>(
    business.tone ? business.tone.split(", ").map(t => t.trim()).filter(Boolean) : []
  );
  const [brandVoice, setBrandVoice] = useState(business.brand_voice || "");
  const [targetLocations, setTargetLocations] = useState<string[]>(business.target_locations || []);
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [targetAgeRanges, setTargetAgeRanges] = useState<string[]>(business.target_age_ranges || []);
  const [targetGender, setTargetGender] = useState(business.target_gender || "");
  const [targetCustomerDescription, setTargetCustomerDescription] = useState(business.target_customer_description || "");
  const [competitors, setCompetitors] = useState<Competitor[]>(() => {
    const raw = business.competitors || [];
    if (raw.length === 0) return [{ name: "", url: "" }];
    return raw.map((c) => {
      const match = c.match(/^(.+?)\s*\((.+)\)$/);
      return match ? { name: match[1].trim(), url: match[2].trim() } : { name: c, url: "" };
    });
  });
  const metaConnection = connections.find((c) => c.platform === "meta" && c.status === "active");
  const [pixelId, setPixelId] = useState(metaConnection?.pixel_id || "");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const justConnected = searchParams.get("connected");
  const errorCode = searchParams.get("error");
  const oauthError = errorCode ? getOAuthError(errorCode) : null;

  const handleLoadAdAccounts = async () => {
    setLoadingAdAccounts(true);
    try {
      const res = await fetch(`/api/connections/meta/ad-accounts?businessId=${business.id}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAdAccounts(data.accounts);
    } catch {
      setInlineError("network_error");
    } finally {
      setLoadingAdAccounts(false);
    }
  };

  const handleSelectAdAccount = async (account: AdAccount) => {
    setSavingAdAccount(true);
    try {
      await fetch("/api/connections/meta/ad-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id, adAccountId: account.id, adAccountName: account.name }),
      });
      setAdAccounts(null);
      router.refresh();
    } finally {
      setSavingAdAccount(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from("businesses")
        .update({
          name,
          daily_budget: dailyBudget ? parseFloat(dailyBudget) : null,
          monthly_budget: monthlyBudget ? parseFloat(monthlyBudget) : null,
        })
        .eq("id", business.id);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleSavePixelId = async () => {
    if (!metaConnection) return;
    setSavingPixelId(true);
    try {
      await fetch("/api/connections/meta/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id, pixelId: pixelId.trim() || null }),
      });
      router.refresh();
    } finally {
      setSavingPixelId(false);
    }
  };

  const handleLocationInput = (val: string) => {
    setLocationInput(val);
    if (val.length >= 2) {
      const lower = val.toLowerCase();
      const matches = (US_STATE_PRESETS as readonly string[])
        .filter(s => s.toLowerCase().startsWith(lower) && !targetLocations.includes(s))
        .slice(0, 5);
      setLocationSuggestions(matches);
    } else {
      setLocationSuggestions([]);
    }
  };

  const addLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (!trimmed) return;
    setTargetLocations(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    setLocationInput("");
    setLocationSuggestions([]);
  };

  const handleSaveProfile = async (andRegenerate = false) => {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const competitorStrings = competitors
        .filter(c => c.name.trim())
        .map(c => c.url.trim() ? `${c.name.trim()} (${c.url.trim()})` : c.name.trim());

      await supabase.from("businesses").update({
        website_url: websiteUrl || null,
        offer_description: offerDescription || null,
        goal: goal || null,
        tone: selectedTones.length > 0 ? selectedTones.join(", ") : null,
        brand_voice: brandVoice || null,
        target_locations: targetLocations,
        target_age_ranges: targetAgeRanges,
        target_gender: targetGender || null,
        target_customer_description: targetCustomerDescription || null,
        competitors: competitorStrings,
      }).eq("id", business.id);

      if (andRegenerate) {
        setRegenerating(true);
        await fetch("/api/brand-research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: business.id }),
        });
        setRegenerating(false);
        router.push("/brand-brief");
        return;
      }

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      router.refresh();
    } finally {
      setSavingProfile(false);
      setRegenerating(false);
    }
  };

  const handleConnect = async (platform: string) => {
    if (isDemoMode()) return;
    setConnecting(platform);
    setInlineError(null);
    try {
      const res = await fetch(`/api/connections/${platform}/authorize?returnTo=/settings`);
      if (!res.ok) {
        setInlineError("network_error");
        setConnecting(null);
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setInlineError("oauth_failed");
        setConnecting(null);
      }
    } catch {
      setInlineError("network_error");
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (isDemoMode()) return;
    setDisconnecting(platform);
    setInlineError(null);
    try {
      const res = await fetch(`/api/connections/${platform}/disconnect`, { method: "POST" });
      if (!res.ok) {
        setInlineError("network_error");
      } else {
        router.refresh();
      }
    } catch {
      setInlineError("network_error");
    } finally {
      setDisconnecting(null);
    }
  };

  const platformNames: Record<string, string> = {
    meta: "Meta (Facebook & Instagram)",
    google_ads: "Google Ads",
    google_drive: "Google Drive",
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {isDemoMode() && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <p className="text-sm text-amber-400">
              Demo mode is active. Changes are simulated and won&apos;t affect real campaigns.
            </p>
          </CardContent>
        </Card>
      )}

      {justConnected && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-green-400">
              Successfully connected {platformNames[justConnected] || justConnected}.
            </p>
          </CardContent>
        </Card>
      )}

      {oauthError && (
        <Card className={oauthError.severity === "error" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}>
          <CardContent className="p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${oauthError.severity === "error" ? "text-red-400" : "text-amber-400"}`} />
              <div>
                <p className={`text-sm font-medium ${oauthError.severity === "error" ? "text-red-400" : "text-amber-400"}`}>
                  {oauthError.title}
                </p>
                <p className={`text-sm mt-0.5 ${oauthError.severity === "error" ? "text-red-400/80" : "text-amber-400/80"}`}>
                  {oauthError.message}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 -mt-1 -mr-2" onClick={() => router.replace("/settings")}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {inlineError && (
        <Card className={getOAuthError(inlineError).severity === "error" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}>
          <CardContent className="p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">{getOAuthError(inlineError).title}</p>
                <p className="text-sm mt-0.5 text-red-400/80">{getOAuthError(inlineError).message}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 -mt-1 -mr-2" onClick={() => setInlineError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Settings</CardTitle>
          <CardDescription>Update your business information and budget limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily">Daily Budget Cap ($)</Label>
              <Input id="daily" type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly">Monthly Budget Cap ($)</Label>
              <Input id="monthly" type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} variant="lumora">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Brand Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand Profile</CardTitle>
          <CardDescription>Edit your targeting and brand info. Changes here affect future brand brief generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Website + Offer */}
          <div className="space-y-2">
            <Label htmlFor="bp-website">Website URL</Label>
            <Input id="bp-website" placeholder="https://acme.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bp-offer">What do you sell or offer?</Label>
            <Textarea id="bp-offer" rows={2} placeholder="Describe your main product or service..." value={offerDescription} onChange={e => setOfferDescription(e.target.value)} />
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <Label>Primary Goal</Label>
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_GOALS.map(g => (
                <button key={g.value} type="button" onClick={() => setGoal(goal === g.value ? "" : g.value)}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${goal === g.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                  <p className="font-medium">{g.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <Label>Target Locations</Label>
            <div className="flex flex-wrap gap-2">
              {(LOCATION_PRESETS as readonly string[]).map(loc => {
                const selected = targetLocations.includes(loc);
                return (
                  <button key={loc} type="button" onClick={() => selected ? setTargetLocations(p => p.filter(l => l !== loc)) : addLocation(loc)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                    {loc}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <div className="flex gap-2">
                <Input placeholder="Type a US state or custom location" value={locationInput}
                  onChange={e => handleLocationInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); locationSuggestions.length > 0 ? addLocation(locationSuggestions[0]) : addLocation(locationInput); }
                    if (e.key === "Escape") setLocationSuggestions([]);
                  }} />
                <Button type="button" variant="outline" size="sm" onClick={() => addLocation(locationInput)} disabled={!locationInput.trim()}>Add</Button>
              </div>
              {locationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                  {locationSuggestions.map(s => (
                    <button key={s} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      onMouseDown={e => { e.preventDefault(); addLocation(s); }}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            {targetLocations.filter(l => !(LOCATION_PRESETS as readonly string[]).includes(l)).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {targetLocations.filter(l => !(LOCATION_PRESETS as readonly string[]).includes(l)).map(loc => (
                  <span key={loc} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm border border-border">
                    {loc}
                    <button type="button" onClick={() => setTargetLocations(p => p.filter(l => l !== loc))} className="text-muted-foreground hover:text-foreground ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Age Range */}
          <div className="space-y-2">
            <Label>Age Range</Label>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map(range => {
                const selected = targetAgeRanges.includes(range);
                return (
                  <button key={range} type="button"
                    onClick={() => setTargetAgeRanges(prev => selected ? prev.filter(r => r !== range) : [...prev, range])}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                    {range}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setTargetGender(targetGender === opt.value ? "" : opt.value)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${targetGender === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ideal customer */}
          <div className="space-y-2">
            <Label htmlFor="bp-customer">Ideal Customer</Label>
            <Textarea id="bp-customer" rows={2} placeholder="e.g. First-time homeowners, small business owners..." value={targetCustomerDescription} onChange={e => setTargetCustomerDescription(e.target.value)} />
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label>Tone</Label>
            <div className="flex flex-wrap gap-2">
              {BRAND_TONES.map(tone => {
                const selected = selectedTones.includes(tone);
                return (
                  <button key={tone} type="button"
                    onClick={() => setSelectedTones(prev => selected ? prev.filter(t => t !== tone) : [...prev, tone])}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                    {tone}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand voice notes */}
          <div className="space-y-2">
            <Label htmlFor="bp-voice">Brand Voice Notes</Label>
            <Textarea id="bp-voice" rows={2} placeholder="Any specific tone or style guidelines..." value={brandVoice} onChange={e => setBrandVoice(e.target.value)} />
          </div>

          {/* Competitors */}
          <div className="space-y-2">
            <Label>Competitors</Label>
            <div className="space-y-2">
              {competitors.map((comp, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <Input placeholder="Competitor name" value={comp.name} onChange={e => setCompetitors(prev => prev.map((c, i) => i === index ? { ...c, name: e.target.value } : c))} />
                    <Input placeholder="https://competitor.com" value={comp.url} onChange={e => setCompetitors(prev => prev.map((c, i) => i === index ? { ...c, url: e.target.value } : c))} />
                  </div>
                  {competitors.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" className="shrink-0 h-9 w-9 p-0" onClick={() => setCompetitors(prev => prev.filter((_, i) => i !== index))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {competitors.length < 5 && (
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setCompetitors(prev => [...prev, { name: "", url: "" }])}>
                <Plus className="mr-1.5 h-4 w-4" /> Add competitor
              </Button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={() => handleSaveProfile(false)} disabled={savingProfile || regenerating} variant="outline">
              <Save className="mr-2 h-4 w-4" />
              {savingProfile && !regenerating ? "Saving..." : profileSaved ? "Saved!" : "Save"}
            </Button>
            <Button onClick={() => handleSaveProfile(true)} disabled={savingProfile || regenerating} variant="lumora">
              <RefreshCw className={`mr-2 h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Regenerating..." : "Save & Regenerate Brief"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Accounts</CardTitle>
          <CardDescription>Manage your ad platform connections.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {["meta", "google_ads", "google_drive"].map((platform) => {
            const conn = connections.find((c) => c.platform === platform);
            const isConnecting = connecting === platform;
            const isDisconnecting = disconnecting === platform;
            const isGoogleAds = platform === "google_ads";
            return (
              <div key={platform} className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{platformNames[platform] || platform}</p>
                  {conn?.platform_account_name && (
                    <p className="text-sm text-muted-foreground">{conn.platform_account_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {conn?.status === "active" ? (
                    <>
                      <Badge variant="success">Connected</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(platform)}
                        disabled={isDisconnecting || isDemoMode()}
                      >
                        {isDisconnecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  ) : conn?.status === "expired" || conn?.status === "revoked" ? (
                    <>
                      <Badge variant={conn.status === "expired" ? "warning" : "destructive"}>
                        {conn.status === "expired" ? "Expired" : "Revoked"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(platform)}
                        disabled={isConnecting || isDemoMode()}
                      >
                        {isConnecting ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="mr-1 h-4 w-4" />
                        )}
                        Reconnect
                      </Button>
                    </>
                  ) : isGoogleAds ? (
                    <Button variant="outline" size="sm" disabled>
                      Coming Soon
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(platform)}
                      disabled={isConnecting || isDemoMode()}
                    >
                      {isConnecting ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="mr-1 h-4 w-4" />
                      )}
                      {isConnecting ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                </div>
                </div>

                {/* Ad account picker — only for Meta when connected */}
                {platform === "meta" && conn?.status === "active" && (
                  <div className="pt-1 space-y-3">
                    {adAccounts === null ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground h-auto py-1 px-2"
                        onClick={handleLoadAdAccounts}
                        disabled={loadingAdAccounts || isDemoMode()}
                      >
                        {loadingAdAccounts ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        Change ad account
                      </Button>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground mb-1">Select ad account:</p>
                        {adAccounts.map((account) => (
                          <button
                            key={account.id}
                            onClick={() => handleSelectAdAccount(account)}
                            disabled={savingAdAccount}
                            className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                              conn.platform_account_id === account.id
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/50 hover:bg-muted/30"
                            }`}
                          >
                            <span className="font-medium">{account.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{account.id}</span>
                          </button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto py-1 px-2"
                          onClick={() => setAdAccounts(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {/* Meta Pixel ID */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Meta Pixel ID (optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          className="h-8 text-sm"
                          placeholder="e.g. 1234567890123"
                          value={pixelId}
                          onChange={(e) => setPixelId(e.target.value)}
                          disabled={isDemoMode()}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 shrink-0"
                          onClick={handleSavePixelId}
                          disabled={savingPixelId || isDemoMode()}
                        >
                          {savingPixelId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Required to use OUTCOME_SALES campaigns with conversion tracking.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guardrails</CardTitle>
          <CardDescription>Safety limits for automated campaign changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Max daily budget increase</span>
            <span>20% per change</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Min time between changes</span>
            <span>6 hours</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Learning phase protection</span>
            <span>72 hours</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Require approval for major changes</span>
            <span className="text-primary">Enabled</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
