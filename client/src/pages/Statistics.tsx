import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_SESSIONS,
  DEMO_STAGES,
  DEMO_PATHS,
  STAGE_CONFIG,
} from "@/lib/mockData";
import {
  BarChart3,
  TrendingUp,
  Timer,
  Layers,
  Database,
  Route,
  Activity,
  Zap,
  PieChart,
} from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";

export default function Statistics() {
  const stats = useMemo(() => {
    const sessions = DEMO_SESSIONS;
    const totalSessions = sessions.length;
    const avgDuration = sessions.reduce((s, x) => s + x.total_duration_ms, 0) / totalSessions;
    const minDuration = Math.min(...sessions.map(s => s.total_duration_ms));
    const maxDuration = Math.max(...sessions.map(s => s.total_duration_ms));

    // Stage duration stats
    const stageStats: Record<string, { totalMs: number; count: number; avgMs: number; maxMs: number }> = {};
    Object.values(DEMO_STAGES).forEach(stages => {
      stages.forEach(stage => {
        if (!stageStats[stage.stage_name]) {
          stageStats[stage.stage_name] = { totalMs: 0, count: 0, avgMs: 0, maxMs: 0 };
        }
        stageStats[stage.stage_name].totalMs += stage.actual_duration_ms;
        stageStats[stage.stage_name].count += 1;
        stageStats[stage.stage_name].maxMs = Math.max(stageStats[stage.stage_name].maxMs, stage.actual_duration_ms);
      });
    });
    Object.values(stageStats).forEach(s => {
      s.avgMs = s.totalMs / s.count;
    });

    // Path stats
    let totalPaths = 0;
    let selectedPaths = 0;
    const pathTypes: Record<string, number> = {};
    Object.values(DEMO_PATHS).forEach(paths => {
      paths.forEach(p => {
        totalPaths++;
        if (p.is_selected) selectedPaths++;
        const baseType = p.path_type.split("+")[0].trim();
        pathTypes[baseType] = (pathTypes[baseType] || 0) + 1;
      });
    });

    // Node type distribution
    const nodeTypes: Record<string, number> = {};
    Object.values(DEMO_STAGES).forEach(stages => {
      stages.forEach(stage => {
        if (stage.explain_output) {
          try {
            const parsed = JSON.parse(stage.explain_output);
            countNodeTypes(parsed[0]?.Plan, nodeTypes);
          } catch { /* ignore */ }
        }
      });
    });

    // Cost distribution
    const costs = sessions.map(s => {
      const planStage = (DEMO_STAGES[s.session_id] || []).find(st => st.stage_name === "plan");
      return { session_id: s.session_id, cost: planStage?.estimated_cost || 0, query: s.query_text };
    });

    return {
      totalSessions, avgDuration, minDuration, maxDuration,
      stageStats, totalPaths, selectedPaths, pathTypes,
      nodeTypes, costs,
    };
  }, []);

  const stageOrder = ["parse", "analyze", "rewrite", "plan", "explain", "execute_start", "execute_end"];
  const maxStageAvg = Math.max(...stageOrder.map(n => stats.stageStats[n]?.avgMs || 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          优化统计
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          查询优化模式和性能指标的汇总分析
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <OverviewCard icon={Database} label="总会话数" value={String(stats.totalSessions)} color="text-primary" />
        <OverviewCard icon={Timer} label="平均耗时" value={`${stats.avgDuration.toFixed(1)}毫秒`} color="text-amber-400" />
        <OverviewCard icon={Zap} label="最快" value={`${stats.minDuration.toFixed(1)}毫秒`} color="text-emerald-400" />
        <OverviewCard icon={Activity} label="最慢" value={`${stats.maxDuration.toFixed(1)}毫秒`} color="text-rose-400" />
      </div>

      {/* Stage Performance */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Layers className="h-4 w-4" />
            平均阶段耗时
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stageOrder.map((name, idx) => {
              const s = stats.stageStats[name];
              if (!s) return null;
              const config = STAGE_CONFIG[name];
              const pct = maxStageAvg > 0 ? (s.avgMs / maxStageAvg) * 100 : 0;

              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs text-muted-foreground w-28 shrink-0">
                    {config?.label || name}
                  </span>
                  <div className="flex-1 h-6 bg-muted/20 rounded-md overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.08 }}
                      className="h-full rounded-md bg-primary/40"
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-mono text-foreground/80">
                      {s.avgMs.toFixed(2)}毫秒 平均
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-20 text-right">
                    最大 {s.maxMs.toFixed(1)}毫秒
                  </span>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Node Type Distribution */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              计划节点类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.nodeTypes)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count], idx) => {
                  const total = Object.values(stats.nodeTypes).reduce((s, v) => s + v, 0);
                  const pct = (count / total) * 100;
                  const colors = [
                    "bg-blue-500/40", "bg-emerald-500/40", "bg-amber-500/40",
                    "bg-violet-500/40", "bg-rose-500/40", "bg-teal-500/40",
                    "bg-pink-500/40", "bg-sky-500/40", "bg-orange-500/40",
                  ];
                  return (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-xs font-mono text-foreground/80 w-36 shrink-0 truncate">
                        {type}
                      </span>
                      <div className="flex-1 h-4 bg-muted/20 rounded overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05 }}
                          className={`h-full rounded ${colors[idx % colors.length]}`}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                        {count}
                      </span>
                    </motion.div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Candidate Path Analysis */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Route className="h-4 w-4" />
              候选路径分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/30">
                <span className="text-sm text-muted-foreground">候选路径总数</span>
                <span className="text-lg font-semibold font-mono text-foreground">{stats.totalPaths}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm text-muted-foreground">已选择（最优）路径</span>
                <span className="text-lg font-semibold font-mono text-primary">{stats.selectedPaths}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/30">
                <span className="text-sm text-muted-foreground">每个查询平均路径数</span>
                <span className="text-lg font-semibold font-mono text-foreground">
                  {stats.totalSessions > 0 ? (stats.totalPaths / stats.totalSessions).toFixed(1) : "0"}
                </span>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">路径类型频率</p>
                <div className="space-y-1.5">
                  {Object.entries(stats.pathTypes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-foreground/70">{type}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {count}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Comparison */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            查询成本概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.costs.map((c, idx) => {
              const maxCost = Math.max(...stats.costs.map(x => x.cost), 1);
              const pct = (c.cost / maxCost) * 100;
              return (
                <motion.div
                  key={c.session_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs text-muted-foreground w-8 shrink-0">
                    #{c.session_id}
                  </span>
                  <div className="flex-1 h-6 bg-muted/20 rounded-md overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.1 }}
                      className={`h-full rounded-md ${
                        c.cost === Math.min(...stats.costs.map(x => x.cost))
                          ? "bg-emerald-500/40"
                          : c.cost === maxCost
                            ? "bg-rose-500/40"
                            : "bg-primary/40"
                      }`}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-mono text-foreground/80 truncate">
                      {c.query.substring(0, 60)}...
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-16 text-right">
                    {c.cost.toFixed(2)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Duration Distribution */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Timer className="h-4 w-4" />
            每个会话的阶段耗时占比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DEMO_SESSIONS.map(session => {
              const stages = DEMO_STAGES[session.session_id] || [];
              return (
                <div key={session.session_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">#{session.session_id}</span>
                    <span className="text-xs font-mono text-muted-foreground">总计{session.total_duration_ms}毫秒</span>
                  </div>
                  <div className="flex h-5 rounded-md overflow-hidden">
                    {stages.map(stage => {
                      const pct = session.total_duration_ms > 0
                        ? (stage.actual_duration_ms / session.total_duration_ms) * 100
                        : 0;
                      if (pct < 0.5) return null;
                      const stageColors: Record<string, string> = {
                        parse: "bg-blue-500/60",
                        analyze: "bg-violet-500/60",
                        rewrite: "bg-pink-500/60",
                        plan: "bg-emerald-500/60",
                        explain: "bg-amber-500/60",
                        execute_start: "bg-orange-500/60",
                        execute_end: "bg-rose-500/60",
                      };
                      return (
                        <div
                          key={stage.stage_id}
                          className={`${stageColors[stage.stage_name] || "bg-gray-500/60"} relative group`}
                          style={{ width: `${pct}%` }}
                          title={`${STAGE_CONFIG[stage.stage_name]?.label || stage.stage_name}: ${stage.actual_duration_ms.toFixed(1)}ms (${pct.toFixed(1)}%)`}
                        >
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-[9px] font-mono text-white drop-shadow-sm whitespace-nowrap">
                              {pct > 8 ? (STAGE_CONFIG[stage.stage_name]?.label || stage.stage_name) : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-2">
              {stageOrder.map(name => {
                const stageColors: Record<string, string> = {
                  parse: "bg-blue-500/60",
                  analyze: "bg-violet-500/60",
                  rewrite: "bg-pink-500/60",
                  plan: "bg-emerald-500/60",
                  explain: "bg-amber-500/60",
                  execute_start: "bg-orange-500/60",
                  execute_end: "bg-rose-500/60",
                };
                return (
                  <div key={name} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-sm ${stageColors[name]}`} />
                    <span className="text-[10px] text-muted-foreground">{STAGE_CONFIG[name]?.label || name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center">
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold font-mono text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function countNodeTypes(plan: Record<string, unknown> | undefined, counts: Record<string, number>) {
  if (!plan) return;
  const type = plan["Node Type"] as string;
  if (type) counts[type] = (counts[type] || 0) + 1;
  if (Array.isArray(plan.Plans)) {
    plan.Plans.forEach((child: Record<string, unknown>) => countNodeTypes(child, counts));
  }
}
