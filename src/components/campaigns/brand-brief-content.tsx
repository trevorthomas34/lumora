"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Loader } from "@/components/shared/loader";
import { FileText, Sparkles, RefreshCw, Target, Zap, Shield, MessageSquare } from "lucide-react";
import type { Business, BrandBrief } from "@/types";

interface BrandBriefContentProps {
  business: Business;
  brandBrief: BrandBrief | null;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  'PAS': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Social Proof': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Before/After': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Direct Offer': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Curiosity': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const SALES_CYCLE_LABELS: Record<string, string> = {
  impulse: 'Impulse (seconds)',
  short: 'Short (days)',
  medium: 'Medium (weeks)',
  long: 'Long (months)',
};

export function BrandBriefContent({ business, brandBrief }: BrandBriefContentProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) throw new Error("Failed to generate brand brief");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader size="lg" text="Analyzing your business and building marketing intelligence..." />
      </div>
    );
  }

  if (!brandBrief) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Brand Brief</h2>
        <EmptyState
          icon={FileText}
          title="No Brand Brief Yet"
          description="LumoraAI will research your website and business to build a performance marketing brief — including customer psychology, ad angles, and copy hooks."
          actionLabel="Generate Brand Brief"
          onAction={handleGenerate}
        />
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    );
  }

  const raw = brandBrief.brief_data;
  const brief = {
    ...raw,
    services_offered: raw.services_offered ?? [],
    key_messages: raw.key_messages ?? [],
    recommended_angles: raw.recommended_angles ?? [],
    objections: raw.objections ?? [],
    proof_points: raw.proof_points ?? [],
    target_audience: {
      demographics: raw.target_audience?.demographics ?? "",
      psychographics: raw.target_audience?.psychographics ?? "",
      precipitating_event: raw.target_audience?.precipitating_event ?? "",
      pain_points: raw.target_audience?.pain_points ?? [],
      desires: raw.target_audience?.desires ?? [],
    },
    brand_voice: {
      tone: raw.brand_voice?.tone ?? "",
      style: raw.brand_voice?.style ?? "",
      do_say: raw.brand_voice?.do_say ?? [],
      dont_say: raw.brand_voice?.dont_say ?? [],
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Brand Brief</h2>
          <p className="text-sm text-muted-foreground">
            Version {brandBrief.version} &middot; {new Date(brandBrief.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {brief.business_type && (
            <Badge variant="outline" className="capitalize">{brief.business_type.replace('_', ' ')}</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleGenerate}>
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Marketing Intelligence — key facts at a glance */}
      {(brief.conversion_event || brief.offer_hook || brief.sales_cycle) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {brief.conversion_event && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-medium text-primary">Conversion Event</p>
              </div>
              <p className="text-sm text-foreground">{brief.conversion_event}</p>
            </div>
          )}
          {brief.offer_hook && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-xs font-medium text-amber-400">Offer Hook</p>
              </div>
              <p className="text-sm text-foreground">{brief.offer_hook}</p>
            </div>
          )}
          {brief.sales_cycle && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Sales Cycle</p>
              </div>
              <p className="text-sm text-foreground">{SALES_CYCLE_LABELS[brief.sales_cycle] || brief.sales_cycle}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Company Summary */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Company Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{brief.company_summary}</p>
          </CardContent>
        </Card>

        {/* Value Proposition */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Value Proposition</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{brief.value_proposition}</p>
          </CardContent>
        </Card>

        {/* Services Offered */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Services / Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {brief.services_offered.map((service, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">&#x2022;</span> {service}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Demographics</span>
              <p className="text-muted-foreground mt-0.5">{brief.target_audience.demographics}</p>
            </div>
            <div>
              <span className="font-medium">Psychographics</span>
              <p className="text-muted-foreground mt-0.5">{brief.target_audience.psychographics}</p>
            </div>
            {brief.target_audience.precipitating_event && (
              <div>
                <span className="font-medium text-amber-400">Buying Trigger</span>
                <p className="text-muted-foreground mt-0.5">{brief.target_audience.precipitating_event}</p>
              </div>
            )}
            <div>
              <span className="font-medium">Pain Points</span>
              <ul className="mt-0.5 space-y-1">
                {brief.target_audience.pain_points.map((p, i) => (
                  <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                    <span className="text-red-400 shrink-0">&#x2022;</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-medium">Desires</span>
              <ul className="mt-0.5 space-y-1">
                {brief.target_audience.desires.map((d, i) => (
                  <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                    <span className="text-green-400 shrink-0">&#x2022;</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Objections + Proof */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Objections &amp; Proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {brief.objections.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Shield className="h-3.5 w-3.5 text-red-400" />
                  <span className="font-medium text-red-400">Why they don&apos;t buy</span>
                </div>
                <ul className="space-y-1">
                  {brief.objections.map((o, i) => (
                    <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                      <span className="text-red-400 shrink-0">&#x2022;</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {brief.proof_points.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Shield className="h-3.5 w-3.5 text-green-400" />
                  <span className="font-medium text-green-400">Proof points needed</span>
                </div>
                <ul className="space-y-1">
                  {brief.proof_points.map((p, i) => (
                    <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                      <span className="text-green-400 shrink-0">&#x2713;</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competitive Positioning */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitive Positioning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{brief.competitive_positioning}</p>
          </CardContent>
        </Card>

        {/* Brand Voice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Brand Voice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Tone: </span>
              <span className="text-muted-foreground">{brief.brand_voice.tone}</span>
            </div>
            <div>
              <span className="font-medium">Style</span>
              <p className="text-muted-foreground mt-0.5">{brief.brand_voice.style}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-medium text-green-400 mb-1">Do say</p>
                <ul className="space-y-1">
                  {brief.brand_voice.do_say.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground">&#x2022; {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-red-400 mb-1">Don&apos;t say</p>
                <ul className="space-y-1">
                  {brief.brand_voice.dont_say.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground">&#x2022; {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.key_messages.map((msg, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 p-2 rounded-md bg-muted/20">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span> {msg}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Ad Angles */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ad Angles &amp; Copy Hooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {brief.recommended_angles.map((angle, i) => {
                const colorClass = FRAMEWORK_COLORS[angle.framework] || FRAMEWORK_COLORS['Curiosity'];
                return (
                  <div key={i} className="border border-border/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] border ${colorClass}`} variant="outline">
                        {angle.framework}
                      </Badge>
                      <span className="text-sm font-medium">{angle.name.split(' — ')[1] || angle.name}</span>
                    </div>
                    <p className="text-sm text-primary font-medium italic">&ldquo;{angle.hook}&rdquo;</p>
                    <p className="text-xs text-muted-foreground">{angle.description}</p>
                    {angle.draft_primary_text && (
                      <div className="mt-2 rounded-md bg-muted/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">Draft copy</p>
                        <p className="text-xs text-foreground/80 leading-relaxed">{angle.draft_primary_text}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
