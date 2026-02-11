"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/utils";
import type { Business, Connection } from "@/types";
import { Save, Link2, Unlink, Sparkles, Loader2, X, AlertTriangle } from "lucide-react";
import { getOAuthError } from "@/lib/oauth/errors";

interface SettingsContentProps {
  business: Business;
  connections: Pick<Connection, "id" | "platform" | "status" | "platform_account_name" | "updated_at">[];
}

export function SettingsContent({ business, connections }: SettingsContentProps) {
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [name, setName] = useState(business.name);
  const [dailyBudget, setDailyBudget] = useState(business.daily_budget?.toString() || "");
  const [monthlyBudget, setMonthlyBudget] = useState(business.monthly_budget?.toString() || "");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const justConnected = searchParams.get("connected");
  const errorCode = searchParams.get("error");
  const oauthError = errorCode ? getOAuthError(errorCode) : null;

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
              <div key={platform} className="flex items-center justify-between p-3 rounded-lg border border-border">
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
