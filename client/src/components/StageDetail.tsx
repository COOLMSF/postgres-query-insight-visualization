import { STAGE_CONFIG, type TraceStage, parseExplainToTree } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlanTreeView from "./PlanTreeView";
import { useMemo } from "react";

interface StageDetailProps {
  stage: TraceStage;
}

export default function StageDetail({ stage }: StageDetailProps) {
  const config = STAGE_CONFIG[stage.stage_name] || {
    label: stage.stage_name,
    color: "#6b7280",
    description: "Stage information",
  };

  const stageData = useMemo(() => {
    try {
      return stage.stage_data ? JSON.parse(stage.stage_data) : null;
    } catch {
      return null;
    }
  }, [stage.stage_data]);

  const planTree = useMemo(() => {
    if (stage.explain_output) {
      return parseExplainToTree(stage.explain_output);
    }
    return null;
  }, [stage.explain_output]);

  return (
    <div className="space-y-4">
      {/* Stage header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{config.label} Stage</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {stage.actual_duration_ms > 0 && (
            <Badge variant="secondary" className="font-mono text-xs">
              {stage.actual_duration_ms.toFixed(2)} ms
            </Badge>
          )}
          {stage.estimated_cost !== null && stage.estimated_cost !== undefined && (
            <Badge variant="outline" className="font-mono text-xs">
              Cost: {stage.estimated_cost.toFixed(2)}
            </Badge>
          )}
          {stage.estimated_rows !== null && stage.estimated_rows !== undefined && (
            <Badge variant="outline" className="font-mono text-xs">
              Rows: {stage.estimated_rows.toLocaleString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Content based on stage type */}
      {stage.stage_name === "explain" && planTree ? (
        <Tabs defaultValue="tree" className="w-full">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="tree">计划树</TabsTrigger>
            <TabsTrigger value="json">原始 JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="tree" className="mt-3">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-0">
                <PlanTreeView root={planTree} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="json" className="mt-3">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <pre className="text-xs font-mono text-foreground/80 overflow-auto max-h-96 whitespace-pre-wrap">
                  {JSON.stringify(JSON.parse(stage.explain_output!), null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : stage.stage_name === "plan" && stageData ? (
        <div className="space-y-4">
          {/* Plan summary */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">计划摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="计划类型" value={stageData.plan_type} />
                <InfoItem label="启动成本" value={stageData.startup_cost?.toFixed(2)} />
                <InfoItem label="总成本" value={stageData.total_cost?.toFixed(2)} />
                <InfoItem label="计划行数" value={stageData.plan_rows?.toLocaleString()} />
                <InfoItem label="计划宽度" value={stageData.plan_width} />
                <InfoItem label="并行安全" value={stageData.parallel_safe ? "是" : "否"} />
                <InfoItem label="并行感知" value={stageData.parallel_aware ? "是" : "否"} />
                <InfoItem label="子计划" value={stageData.num_subplans} />
              </div>
            </CardContent>
          </Card>

          {/* Candidate plans */}
          {stageData.candidate_plans && stageData.candidate_plans.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  候选计划 ({stageData.candidate_plans.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stageData.candidate_plans.map((plan: { type: string; cost: number; selected: boolean }, i: number) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        plan.selected
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/20 border-border/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            plan.selected ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        />
                        <span className={`text-sm font-mono ${plan.selected ? "text-primary font-medium" : "text-foreground/70"}`}>
                          {plan.type}
                        </span>
                        {plan.selected && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            已选择
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">
                        成本：{plan.cost.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : stageData ? (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">阶段数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(stageData).map(([key, value]) => {
                if (typeof value === "object" && value !== null) return null;
                return (
                  <InfoItem
                    key={key}
                    label={key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    value={String(value)}
                  />
                );
              })}
            </div>

            {/* Array/Object fields */}
            {Object.entries(stageData).map(([key, value]) => {
              if (typeof value !== "object" || value === null) return null;
              return (
                <div key={key} className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <pre className="text-xs font-mono text-foreground/70 bg-background/50 rounded-lg p-3 overflow-auto max-h-48">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            此阶段暂无详细数据。
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-mono text-foreground/90">{value ?? "N/A"}</p>
    </div>
  );
}
