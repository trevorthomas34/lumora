"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ScrollText } from "lucide-react";
import type { ActionLog } from "@/types";

interface ActionLogContentProps {
  actions: ActionLog[];
}

export function ActionLogContent({ actions }: ActionLogContentProps) {
  if (actions.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No Activity Yet"
        description="All campaign changes and agent actions will be recorded here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Action Log</h2>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Time</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Actor</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Action</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Description</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Platform</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-4 text-muted-foreground whitespace-nowrap">
                      {new Date(action.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Badge variant={action.actor === "agent" ? "default" : "secondary"}>
                        {action.actor}
                      </Badge>
                    </td>
                    <td className="p-4 font-medium">{action.action_type.replace(/_/g, " ")}</td>
                    <td className="p-4 text-muted-foreground max-w-md truncate">{action.description}</td>
                    <td className="p-4 capitalize">{action.platform?.replace("_", " ") || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
