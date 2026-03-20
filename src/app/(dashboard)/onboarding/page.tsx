"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BUSINESS_GOALS, BRAND_TONES, LOCATION_PRESETS, US_STATE_PRESETS, US_CITIES_PRESETS, AGE_RANGES, GENDER_OPTIONS } from "@/lib/constants";
import { isDemoMode } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, AlertTriangle, X, Rocket, Plus, MapPin } from "lucide-react";
import { getOAuthError } from "@/lib/oauth/errors";

const STEPS = [
  { title: "Business Basics", description: "Tell us about your business" },
  { title: "Audience & Budget", description: "Who you're targeting and how much" },
  { title: "Goal", description: "What do you want to achieve?" },
  { title: "Brand Voice", description: "How should your ads sound?" },
  { title: "Connect Accounts", description: "Link your ad platforms" },
];

const DRAFT_KEY = "lumora_onboarding_draft";

type Competitor = { name: string; url: string };

function saveDraft(data: object) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [kickstarting, setKickstarting] = useState(false);
  const [kickstartError, setKickstartError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const initialized = useRef(false);

  const justConnected = searchParams.get("connected");
  const errorCode = searchParams.get("error");
  const oauthError = errorCode ? getOAuthError(errorCode) : null;

  const [formData, setFormData] = useState({
    name: "",
    website_url: "",
    offer_description: "",
    target_locations: [] as string[],
    target_age_ranges: [] as string[],
    target_gender: "" as string,
    target_customer_description: "",
    daily_budget: "",
    monthly_budget: "",
    goal: "" as string,
    brand_voice: "",
    tones: [] as string[],
  });

  const [competitors, setCompetitors] = useState<Competitor[]>([{ name: "", url: "" }]);

  // Restore draft on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.competitors?.length) setCompetitors(parsed.competitors);
        setStep(justConnected ? 4 : (parsed.step ?? 0));
        return;
      }
    } catch {}
    if (justConnected) setStep(4);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist draft on every change
  useEffect(() => {
    if (!initialized.current) return;
    saveDraft({ formData, competitors, step });
  }, [formData, competitors, step]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationInput = (val: string) => {
    setLocationInput(val);
    if (val.length >= 2) {
      const lower = val.toLowerCase();
      const stateMatches = (US_STATE_PRESETS as readonly string[])
        .filter(s => s.toLowerCase().startsWith(lower) && !formData.target_locations.includes(s));
      const cityMatches = (US_CITIES_PRESETS as readonly string[])
        .filter(s => s.toLowerCase().startsWith(lower) && !formData.target_locations.includes(s));
      setLocationSuggestions([...stateMatches, ...cityMatches].slice(0, 6));
    } else {
      setLocationSuggestions([]);
    }
  };

  const findCanonicalLocation = (val: string): string | null => {
    const lower = val.toLowerCase();
    return [...LOCATION_PRESETS, ...US_STATE_PRESETS, ...US_CITIES_PRESETS].find(
      (l) => l.toLowerCase() === lower
    ) ?? null;
  };

  const addLocation = (loc: string) => {
    const canonical = findCanonicalLocation(loc);
    if (!canonical) return;
    setFormData((prev) => ({
      ...prev,
      target_locations: prev.target_locations.includes(canonical)
        ? prev.target_locations
        : [...prev.target_locations, canonical],
    }));
    setLocationInput("");
    setLocationSuggestions([]);
  };

  const removeLocation = (loc: string) => {
    setFormData((prev) => ({
      ...prev,
      target_locations: prev.target_locations.filter((l) => l !== loc),
    }));
  };

  const updateCompetitor = (index: number, field: keyof Competitor, value: string) => {
    setCompetitors((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const addCompetitor = () => {
    if (competitors.length < 5) {
      setCompetitors((prev) => [...prev, { name: "", url: "" }]);
    }
  };

  const removeCompetitor = (index: number) => {
    setCompetitors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setLoading(true);
    setKickstartError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const competitorStrings = competitors
        .filter((c) => c.name.trim())
        .map((c) => (c.url.trim() ? `${c.name.trim()} (${c.url.trim()})` : c.name.trim()));

      const { error } = await supabase
        .from("businesses")
        .update({
          name: formData.name,
          website_url: formData.website_url || null,
          offer_description: formData.offer_description || null,
          target_locations: formData.target_locations,
          target_age_ranges: formData.target_age_ranges,
          target_gender: formData.target_gender || null,
          target_customer_description: formData.target_customer_description || null,
          daily_budget: formData.daily_budget ? parseFloat(formData.daily_budget) : null,
          monthly_budget: formData.monthly_budget ? parseFloat(formData.monthly_budget) : null,
          goal: formData.goal || null,
          brand_voice: formData.brand_voice || null,
          competitors: competitorStrings,
          tone: formData.tones.length > 0 ? formData.tones.join(', ') : null,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      clearDraft();

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
        const errData = await kickRes.json().catch(() => ({}));
        setKickstartError(errData.error || "Failed to generate campaign. You can try again from the Brand Brief page.");
        setLoading(false);
        setKickstarting(false);
        return;
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
                <Label className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Target Locations
                </Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  These control where your Meta ads are shown. Select all that apply.
                </p>

                {/* Preset badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {LOCATION_PRESETS.map((loc) => {
                    const selected = formData.target_locations.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => selected ? removeLocation(loc) : addLocation(loc)}
                        className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>

                {/* Custom location input with state suggestions */}
                <div className="relative pt-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search US states or cities..."
                      value={locationInput}
                      onChange={(e) => handleLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (locationSuggestions.length > 0) addLocation(locationSuggestions[0]);
                          else if (findCanonicalLocation(locationInput)) addLocation(locationInput);
                        }
                        if (e.key === "Escape") setLocationSuggestions([]);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLocation(locationInput)}
                      disabled={!findCanonicalLocation(locationInput)}
                    >
                      Add
                    </Button>
                  </div>
                  {locationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                      {locationSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                          onMouseDown={(e) => { e.preventDefault(); addLocation(s); }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected custom locations (non-preset) */}
                {formData.target_locations.filter(l => !(LOCATION_PRESETS as readonly string[]).includes(l)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.target_locations
                      .filter(l => !(LOCATION_PRESETS as readonly string[]).includes(l))
                      .map((loc) => (
                        <span
                          key={loc}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm border border-border"
                        >
                          {loc}
                          <button
                            type="button"
                            onClick={() => removeLocation(loc)}
                            className="text-muted-foreground hover:text-foreground ml-0.5"
                          >
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
                <p className="text-xs text-muted-foreground -mt-1">Select all that apply.</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AGE_RANGES.map((range) => {
                    const selected = formData.target_age_ranges.includes(range);
                    return (
                      <button
                        key={range}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            target_age_ranges: selected
                              ? prev.target_age_ranges.filter((r) => r !== range)
                              : [...prev.target_age_ranges, range],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
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
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField("target_gender", formData.target_gender === opt.value ? "" : opt.value)}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        formData.target_gender === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ideal customer */}
              <div className="space-y-2">
                <Label htmlFor="target_customer_description">Who is your ideal customer?</Label>
                <Textarea
                  id="target_customer_description"
                  placeholder="e.g. First-time homeowners, small business owners who need help with taxes, new moms looking for organic products..."
                  value={formData.target_customer_description}
                  onChange={(e) => updateField("target_customer_description", e.target.value)}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  The AI uses this to sharpen targeting and ad copy. More detail = better results.
                </p>
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
                <p className="text-xs text-muted-foreground -mt-1">Select all that apply.</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {BRAND_TONES.map((tone) => {
                    const selected = formData.tones.includes(tone);
                    return (
                      <button
                        key={tone}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            tones: selected
                              ? prev.tones.filter((t) => t !== tone)
                              : [...prev.tones, tone],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {tone}
                      </button>
                    );
                  })}
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
              <div className="space-y-3">
                <div>
                  <Label>Competitors</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Adding URLs lets the AI analyze their positioning and messaging.
                  </p>
                </div>
                <div className="space-y-2">
                  {competitors.map((comp, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <Input
                          placeholder="Competitor name"
                          value={comp.name}
                          onChange={(e) => updateCompetitor(index, "name", e.target.value)}
                        />
                        <Input
                          placeholder="https://competitor.com"
                          value={comp.url}
                          onChange={(e) => updateCompetitor(index, "url", e.target.value)}
                        />
                      </div>
                      {competitors.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-9 w-9 p-0"
                          onClick={() => removeCompetitor(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {competitors.length < 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={addCompetitor}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add competitor
                  </Button>
                )}
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

          {kickstartError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">Campaign generation failed</p>
                <p className="text-sm mt-0.5 text-red-400/80">{kickstartError}</p>
              </div>
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
