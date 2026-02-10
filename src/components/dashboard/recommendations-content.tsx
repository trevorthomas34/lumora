"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { Lightbulb, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import type { Recommendation } from "@/types";

interface RecommendationsContentProps {
  businessId: string;
  recommendations: Recommendation[];
}

export function RecommendationsContent({ businessId, recommendations }: RecommendationsContentProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const pending = recommendations.filter((r) => r.status === "pending");
  const resolved = recommendations.filter((r) => r.status !== "pending");

  const handleDecision = async (id: string, decision: "approved" | "denied" | "dismissed") => {
    setProcessing(id);
    try {
      await supabase
        .from("recommendations")
        .update({ status: decision, resolved_at: new Date().toISOString() })
        .eq("id", id);

      await supabase.from("action_logs").insert({
        business_id: businessId,
        entity_id: id,
        actor: "user",
        action_type: "recommendation_" + decision,
        description: `User ${decision} recommendation`,
      });

      router.refresh();
    } finally {
      setProcessing(null);
    }
  };

  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No Recommendations"
        description="LumoraAI will analyze your campaigns and suggest optimizations here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Recommendations</h2>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Pending ({pending.length})</h3>
          {pending.map((rec) => (
            <Card key={rec.id} className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="font-medium">{rec.title}</span>
                      <Badge variant={rec.risk_level === "low" ? "success" : rec.risk_level === "medium" ? "warning" : "destructive"}>
                        {rec.risk_level} risk
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>

                    {expanded === rec.id && (
                      <div className="mt-3 space-y-2 text-sm">
                        <p><span className="font-medium">Action:</span> <span className="text-muted-foreground">{rec.action}</span></p>
                        <p><span className="font-medium">Rationale:</span> <span className="text-muted-foreground">{rec.rationale}</span></p>
                        <p><span className="font-medium">Est. Impact:</span> <span className="text-muted-foreground">{rec.estimated_impact}</span></p>
                        <p><span className="font-medium">Confidence:</span> <span className="text-muted-foreground">{(rec.confidence * 100).toFixed(0)}%</span></p>
                      </div>
                    )}

                    <button
                      onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
                      className="text-xs text-primary mt-2 flex items-center gap-1"
                    >
                      {expanded === rec.id ? <>Less <ChevronUp className="h-3 w-3" /></> : <>Details <ChevronDown className="h-3 w-3" /></>}
                    </button>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleDecision(rec.id, "dismissed")} disabled={processing === rec.id}>
                      Dismiss
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDecision(rec.id, "denied")} disabled={processing === rec.id}>
                      <X className="h-3 w-3 mr-1" /> Deny
                    </Button>
                    <Button size="sm" variant="lumora" onClick={() => handleDecision(rec.id, "approved")} disabled={processing === rec.id}>
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Resolved ({resolved.length})</h3>
          {resolved.map((rec) => (
            <Card key={rec.id} className="opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{rec.status}</Badge>
                  <span className="font-medium text-sm">{rec.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {rec.resolved_at ? new Date(rec.resolved_at).toLocaleDateString() : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
