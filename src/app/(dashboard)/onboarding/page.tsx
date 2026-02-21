"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BUSINESS_GOALS, BRAND_TONES } from "@/lib/constants";
import { isDemoMode } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, AlertTriangle, X, Rocket } from "lucide-react";
import { getOAuthError } from "@/lib/oauth/errors";

const STEPS = [
  { title: "Business Basics", description: "Tell us about your business" },
  { title: "Geography & Budget", description: "Where and how much" },
  { title: "Goal", description: "What do you want to achieve?" },
  { title: "Brand Voice", description: "How should your ads sound?" },
  { title: "Connect Accounts", description: "Link your ad platforms" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [kickstarting, setKickstarting] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const justConnected = searchParams.get("connected");
  const errorCode = searchParams.get("error");
  const oauthError = errorCode ? getOAuthError(errorCode) : null;

  const [formData, setFormData] = useState({
    name: "",
    website_url: "",
    offer_description: "",
    target_locations: "",
    daily_budget: "",
    monthly_budget: "",
    goal: "" as string,
    brand_voice: "",
    competitors: "",
    tone: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("businesses")
        .update({
          name: formData.name,
          website_url: formData.website_url || null,
          offer_description: formData.offer_description || null,
          target_locations: formData.target_locations
            ? formData.target_locations.split(",").map((s) => s.trim())
            : [],
          daily_budget: formData.daily_budget ? parseFloat(formData.daily_budget) : null,
          monthly_budget: formData.monthly_budget ? parseFloat(formData.monthly_budget) : null,
          goal: formData.goal || null,
          brand_voice: formData.brand_voice || null,
          competitors: formData.competitors
            ? formData.competitors.split(",").map((s) => s.trim())
            : [],
          tone: formData.tone || null,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Kickstart: auto-generate brand brief + campaign plan
      setKickstarting(true);
      const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", user.id).single();
      if (biz) {
        const kickRes = await fetch("/api/campaigns/kickstart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: biz.id }),
        });
        if (kickRes.ok) {
          const { planId } = await kickRes.json();
          router.push(`/campaigns/${planId}?generated=true`);
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Onboarding error:", err);
    } finally {
      setLoading(false);
      setKickstarting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return formData.name.length > 0;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <p className="text-sm text-muted-foreground mt-2">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>{STEPS[step].title}</CardTitle>
          <CardDescription>{STEPS[step].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  placeholder="Acme Co"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  placeholder="https://acme.com"
                  value={formData.website_url}
                  onChange={(e) => updateField("website_url", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer">What do you sell or offer?</Label>
                <Textarea
                  id="offer"
                  placeholder="Describe your main product or service..."
                  value={formData.offer_description}
                  onChange={(e) => updateField("offer_description", e.target.value)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="locations">Target Locations</Label>
                <Input
                  id="locations"
                  placeholder="US, UK, Canada (comma-separated)"
                  value={formData.target_locations}
                  onChange={(e) => updateField("target_locations", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily_budget">Daily Budget ($)</Label>
                  <Input
                    id="daily_budget"
                    type="number"
                    placeholder="50"
                    value={formData.daily_budget}
                    onChange={(e) => updateField("daily_budget", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_budget">Monthly Budget ($)</Label>
                  <Input
                    id="monthly_budget"
                    type="number"
                    placeholder="1500"
                    value={formData.monthly_budget}
                    onChange={(e) => updateField("monthly_budget", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUSINESS_GOALS.map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => updateField("goal", goal.value)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    formData.goal === goal.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium">{goal.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Tone</Label>
                <div className="flex flex-wrap gap-2">
                  {BRAND_TONES.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => updateField("tone", tone)}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        formData.tone === tone
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_voice">Brand Voice Notes</Label>
                <Textarea
                  id="brand_voice"
                  placeholder="Any specific tone or style guidelines..."
                  value={formData.brand_voice}
                  onChange={(e) => updateField("brand_voice", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitors">Competitors</Label>
                <Input
                  id="competitors"
                  placeholder="Competitor A, Competitor B (comma-separated)"
                  value={formData.competitors}
                  onChange={(e) => updateField("competitors", e.target.value)}
                />
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {oauthError && (
                <div className={`rounded-lg border p-4 flex items-start justify-between gap-3 ${
                  oauthError.severity === "error" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"
                }`}>
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
                  <Button variant="ghost" size="sm" className="shrink-0 -mt-1 -mr-2" onClick={() => router.replace("/onboarding")}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {connectError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-400">{getOAuthError(connectError).title}</p>
                      <p className="text-sm mt-0.5 text-red-400/80">{getOAuthError(connectError).message}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 -mt-1 -mr-2" onClick={() => setConnectError(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {isDemoMode() ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-sm text-amber-400">
                    <Sparkles className="inline h-4 w-4 mr-1" />
                    Demo mode is active. Account connections are simulated.
                  </p>
                </div>
              ) : (
                <>
                  {[
                    { platform: "meta", label: "Meta (Facebook & Instagram)", desc: "Connect to manage Meta ads" },
                    { platform: "google_drive", label: "Google Drive", desc: "Import creative assets" },
                  ].map(({ platform, label, desc }) => {
                    const isConnected = justConnected === platform;
                    const isConnecting = connecting === platform;
                    return (
                      <div key={platform} className="rounded-lg border border-border p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                        {isConnected ? (
                          <Badge variant="success">Connected</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isConnecting}
                            onClick={async () => {
                              setConnecting(platform);
                              setConnectError(null);
                              try {
                                const res = await fetch(`/api/connections/${platform}/authorize?returnTo=/onboarding`);
                                if (!res.ok) {
                                  setConnectError("network_error");
                                  setConnecting(null);
                                  return;
                                }
                                const data = await res.json();
                                if (data.url) {
                                  window.location.href = data.url;
                                } else {
                                  setConnectError("oauth_failed");
                                  setConnecting(null);
                                }
                              } catch {
                                setConnectError("network_error");
                                setConnecting(null);
                              }
                            }}
                          >
                            {isConnecting ? (
                              <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Connecting...</>
                            ) : (
                              "Connect"
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              <p className="text-sm text-muted-foreground text-center">
                You can always connect these later in Settings.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="lumora" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button variant="lumora" onClick={handleComplete} disabled={loading || kickstarting || !canProceed()}>
                {kickstarting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building your first campaign...</>
                ) : loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</>
                ) : (
                  <>Complete Setup <Rocket className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
