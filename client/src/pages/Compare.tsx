import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  DEMO_SESSIONS,
  DEMO_STAGES,
  DEMO_PATHS,
  STAGE_CONFIG,
  type TraceSession,
} from "@/lib/mockData";
import {
  GitCompare,
  ArrowRight,
  Timer,
  Layers,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";

export default function Compare() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparing, setComparing] = useState(false);

  const toggleSession = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectedSessions = useMemo(
    () => DEMO_SESSIONS.filter(s => selectedIds.includes(s.session_id)),
    [selectedIds]
  );

  const comparisonData = useMemo(() => {
    if (selectedSessions.length < 2) return null;

    const stageNames = new Set<string>();
    selectedSessions.forEach(s => {
      const stages = DEMO_STAGES[s.session_id] || [];
      stages.forEach(st => stageNames.add(st.stage_name));
    });

    const stageComparison = Array.from(stageNames).map(name => {
      const config = STAGE_CONFIG[name];
      const values = selectedSessions.map(s => {
        const stages = DEMO_STAGES[s.session_id] || [];
        const match = stages.find(st => st.stage_name === name);
        return {
          session_id: s.session_id,
          duration_ms: match?.actual_duration_ms || 0,
          estimated_cost: match?.estimated_cost,
          estimated_rows: match?.estimated_rows,
          node_type: match?.node_type,
        };
      });
      return { stage_name: name, label: config?.label || name, values };
    });

    return { stageComparison };
  }, [selectedSessions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-primary" />
          会话对比
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          比较不同查询会话的优化路径和性能
        </p>
      </div>

      {/* Session selector */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              选择要对比的会话（至少 2 个）
            </CardTitle>
            {selectedIds.length >= 2 && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setComparing(true)}
              >
                <GitCompare className="h-3.5 w-3.5" />
                对比 ({selectedIds.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DEMO_SESSIONS.map(session => (
              <label
                key={session.session_id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedIds.includes(session.session_id)
                    ? "bg-primary/5 border-primary/30"
                    : "bg-muted/10 border-border/30 hover:bg-muted/20"
                }`}
              >
                <Checkbox
                  checked={selectedIds.includes(session.session_id)}
                  onCheckedChange={() => toggleSession(session.session_id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground/90 truncate">
                    {session.query_text}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>#{session.session_id}</span>
                    <span>{session.total_stages} 个阶段</span>
                    <span>{session.total_duration_ms}毫秒</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-mono shrink-0">
                  {session.total_duration_ms}毫秒
                </Badge>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparing && comparisonData && selectedSessions.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Duration overview */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                总耗时对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedSessions.map((session, idx) => {
                  const maxDuration = Math.max(...selectedSessions.map(s => s.total_duration_ms));
                  const pct = (session.total_duration_ms / maxDuration) * 100;
                  const isFastest = session.total_duration_ms === Math.min(...selectedSessions.map(s => s.total_duration_ms));
                  const isSlowest = session.total_duration_ms === maxDuration;

                  return (
                    <div key={session.session_id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-8 shrink-0">
                        #{session.session_id}
                      </span>
                      <div className="flex-1 h-6 bg-muted/20 rounded-md overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.1 }}
                          className={`h-full rounded-md ${
                            isFastest ? "bg-emerald-500/40" : isSlowest ? "bg-rose-500/40" : "bg-primary/40"
                          }`}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-xs font-mono text-foreground/80">
                          {session.total_duration_ms}ms
                        </span>
                      </div>
                      {isFastest && (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                          <TrendingDown className="h-3 w-3 mr-0.5" />
                          最快
                        </Badge>
                      )}
                      {isSlowest && selectedSessions.length > 1 && !isFastest && (
                        <Badge className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/20 shrink-0">
                          <TrendingUp className="h-3 w-3 mr-0.5" />
                          最慢
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Stage-by-stage comparison */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4" />
                逐阶段对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">阶段</th>
                      {selectedSessions.map(s => (
                        <th key={s.session_id} className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                          #{s.session_id} 耗时
                        </th>
                      ))}
                      {selectedSessions.length === 2 && (
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">差异</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.stageComparison.map(sc => {
                      const durations = sc.values.map(v => v.duration_ms);
                      const diff = selectedSessions.length === 2 ? durations[1] - durations[0] : 0;

                      return (
                        <tr key={sc.stage_name} className="border-b border-border/10 hover:bg-muted/10">
                          <td className="py-2 px-3 text-foreground/80 capitalize">
                            {sc.label}
                          </td>
                          {sc.values.map(v => (
                            <td key={v.session_id} className="py-2 px-3 text-right font-mono text-foreground/70">
                              {v.duration_ms.toFixed(1)}ms
                            </td>
                          ))}
                          {selectedSessions.length === 2 && (
                            <td className="py-2 px-3 text-right font-mono">
                              <span className={
                                diff > 0 ? "text-rose-400" : diff < 0 ? "text-emerald-400" : "text-muted-foreground"
                              }>
                                {diff > 0 ? "+" : ""}{diff.toFixed(1)}ms
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Plan comparison */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Timer className="h-4 w-4" />
                计划策略对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSessions.map(session => {
                  const stages = DEMO_STAGES[session.session_id] || [];
                  const planStage = stages.find(s => s.stage_name === "plan");
                  let planData: { plan_type?: string; total_cost?: number; candidate_plans?: Array<{ type: string; cost: number; selected: boolean }> } | null = null;
                  try {
                    planData = planStage?.stage_data ? JSON.parse(planStage.stage_data) : null;
                  } catch { /* ignore */ }

                  return (
                    <div key={session.session_id} className="p-4 rounded-lg border border-border/30 bg-muted/5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">会话 #{session.session_id}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {planData?.plan_type || "无"}
                        </Badge>
                      </div>
                      {planData?.candidate_plans && (
                        <div className="space-y-1.5">
                          {planData.candidate_plans.map((cp, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between text-xs p-2 rounded ${
                                cp.selected ? "bg-primary/10 text-primary" : "text-muted-foreground"
                              }`}
                            >
                              <span className="font-mono">{cp.type}</span>
                              <span className="font-mono">{cp.cost.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
