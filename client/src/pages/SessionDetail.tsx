import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import StagePipeline from "@/components/StagePipeline";
import StageDetail from "@/components/StageDetail";
import {
  DEMO_SESSIONS,
  DEMO_STAGES,
  DEMO_PATHS,
  type TraceStage,
  type TracePath,
} from "@/lib/mockData";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Timer,
  Layers,
  Hash,
  Database,
  User,
  Calendar,
  Route,
  Loader2,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";

export default function SessionDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const sessionId = Number(params.id);

  // Try mock data first
  const mockSession = DEMO_SESSIONS.find(s => s.session_id === sessionId);
  const mockStages = DEMO_STAGES[sessionId] || [];
  const mockPaths = DEMO_PATHS[sessionId] || [];
  const isMockMode = !!mockSession;

  // Fetch from API if not found in mock data
  const apiQuery = trpc.query.getSessionDetail.useQuery(
    { sessionId },
    { enabled: !isMockMode, retry: false }
  );

  // Unified data accessors
  const sessionData = useMemo(() => {
    if (isMockMode && mockSession) {
      return {
        id: mockSession.session_id,
        queryText: mockSession.query_text,
        databaseName: mockSession.database_name,
        userName: mockSession.username,
        startTime: mockSession.start_time,
        totalDurationMs: mockSession.total_duration_ms,
        totalStages: mockSession.total_stages,
        status: mockSession.status,
      };
    }
    if (apiQuery.data?.data?.session) {
      const s = apiQuery.data.data.session;
      return {
        id: s.id,
        queryText: s.queryText,
        databaseName: s.databaseName,
        userName: s.userName,
        startTime: s.startTime,
        totalDurationMs: s.totalDurationMs ?? 0,
        totalStages: s.totalStages,
        status: s.status,
      };
    }
    return null;
  }, [isMockMode, mockSession, apiQuery.data]);

  // Normalize stages to a common shape for pipeline + duration breakdown
  const normalizedStages = useMemo(() => {
    if (isMockMode) {
      return mockStages.map(s => ({
        key: s.stage_id,
        stageSeq: s.stage_seq,
        stageName: s.stage_name,
        durationMs: s.actual_duration_ms,
        stageData: s.stage_data,
        explainOutput: s.explain_output,
        estimatedCost: s.estimated_cost,
        estimatedRows: s.estimated_rows,
        raw: s,
      }));
    }
    if (apiQuery.data?.data?.stages) {
      return apiQuery.data.data.stages.map((s: any) => ({
        key: s.id,
        stageSeq: s.stageSeq,
        stageName: s.stageName,
        durationMs: s.durationMs ?? 0,
        stageData: s.stageData,
        explainOutput: null,
        estimatedCost: null,
        estimatedRows: null,
        raw: s,
      }));
    }
    return [];
  }, [isMockMode, mockStages, apiQuery.data]);

  // Normalize paths
  const normalizedPaths = useMemo(() => {
    if (isMockMode) {
      return mockPaths.map(p => ({
        key: p.path_id,
        pathType: p.path_type,
        pathDescription: p.path_description,
        totalCost: p.total_cost,
        startupCost: p.startup_cost,
        rowsEstimate: p.rows_estimate,
        isSelected: p.is_selected,
      }));
    }
    if (apiQuery.data?.data?.paths) {
      return apiQuery.data.data.paths.map((p: any) => ({
        key: p.id,
        pathType: p.pathType,
        pathDescription: p.pathDescription,
        totalCost: p.totalCost,
        startupCost: p.startupCost,
        rowsEstimate: p.rowsEstimate,
        isSelected: p.isSelected,
      }));
    }
    return [];
  }, [isMockMode, mockPaths, apiQuery.data]);

  const [activeStageSeq, setActiveStageSeq] = useState<number | null>(null);

  // Set initial active stage when data loads
  useEffect(() => {
    if (normalizedStages.length > 0 && activeStageSeq === null) {
      setActiveStageSeq(normalizedStages[0].stageSeq);
    }
  }, [normalizedStages, activeStageSeq]);

  // Replay state
  const [replayMode, setReplayMode] = useState(false);
  const [replayStage, setReplayStage] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeStageData = useMemo(() => {
    if (activeStageSeq === null) return null;
    return normalizedStages.find(s => s.stageSeq === activeStageSeq) || null;
  }, [normalizedStages, activeStageSeq]);

  // Build a TraceStage-compatible object for StageDetail (works for both modes)
  const activeStageForDetail: TraceStage | null = useMemo(() => {
    if (!activeStageData) return null;
    if (isMockMode) return activeStageData.raw as TraceStage;
    // Convert realtime stage to TraceStage shape for StageDetail
    const raw = activeStageData.raw as any;
    const stageData = raw.stageData;
    // For explain stage, stageData.explainData contains the EXPLAIN rows
    let explainOutput: string | null = null;
    if (activeStageData.stageName === "explain" && stageData?.explainData) {
      // explainData is array of {QUERY PLAN: string} rows from EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
      explainOutput = null; // text format, not JSON tree — skip tree view
    }
    if (activeStageData.stageName === "plan" && stageData?.plan) {
      // plan stage has JSON plan data — convert to explain_output for tree view
      explainOutput = JSON.stringify(stageData.plan);
    }
    return {
      stage_id: raw.id,
      session_id: raw.sessionId,
      stage_seq: raw.stageSeq,
      stage_name: raw.stageName,
      stage_data: stageData ? JSON.stringify(stageData) : null,
      plan_tree: null,
      explain_output: explainOutput,
      node_type: null,
      estimated_cost: null,
      estimated_rows: null,
      actual_duration_ms: raw.durationMs ?? 0,
      created_at: raw.createdAt ?? "",
      metadata: {},
    };
  }, [activeStageData, isMockMode]);

  // Replay controls
  const startReplay = useCallback(() => {
    if (normalizedStages.length === 0) return;
    setReplayMode(true);
    setReplayStage(0);
    setReplayPlaying(true);
    setActiveStageSeq(normalizedStages[0].stageSeq);
  }, [normalizedStages]);

  const toggleReplayPause = useCallback(() => {
    setReplayPlaying(prev => !prev);
  }, []);

  const replayStep = useCallback(() => {
    setReplayStage(prev => {
      const next = Math.min(prev + 1, normalizedStages.length - 1);
      setActiveStageSeq(normalizedStages[next].stageSeq);
      return next;
    });
  }, [normalizedStages]);

  const resetReplay = useCallback(() => {
    setReplayMode(false);
    setReplayPlaying(false);
    setReplayStage(0);
    if (normalizedStages.length > 0) {
      setActiveStageSeq(normalizedStages[0].stageSeq);
    }
  }, [normalizedStages]);

  useEffect(() => {
    if (replayPlaying && replayMode) {
      replayTimerRef.current = setInterval(() => {
        setReplayStage(prev => {
          if (prev >= normalizedStages.length - 1) {
            setReplayPlaying(false);
            return prev;
          }
          const next = prev + 1;
          setActiveStageSeq(normalizedStages[next].stageSeq);
          return next;
        });
      }, replaySpeed);
    }
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayPlaying, replayMode, replaySpeed, normalizedStages]);

  // Loading state for API mode
  if (!isMockMode && apiQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">加载会话数据...</p>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">会话不存在</p>
        <Button variant="outline" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回分析器
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              会话 #{sessionData.id}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              完整优化跟踪视图
            </p>
          </div>
        </div>
        <Badge variant={sessionData.status === "completed" ? "default" : "secondary"}>
          {sessionData.status === "completed" ? "已完成" : sessionData.status}
        </Badge>
      </div>

      {/* Session metadata */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-4 px-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetaItem icon={Timer} label="耗时" value={`${typeof sessionData.totalDurationMs === 'number' ? sessionData.totalDurationMs.toFixed(2) : sessionData.totalDurationMs}毫秒`} />
            <MetaItem icon={Layers} label="阶段" value={String(sessionData.totalStages)} />
            <MetaItem icon={Database} label="数据库" value={sessionData.databaseName} />
            <MetaItem icon={User} label="用户" value={sessionData.userName} />
            <MetaItem icon={Calendar} label="时间" value={new Date(sessionData.startTime).toLocaleString()} />
          </div>
          <Separator className="my-3" />
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">查询</p>
            <pre className="text-sm font-mono text-foreground/90 bg-background/50 rounded-lg p-3 overflow-auto max-h-24 whitespace-pre-wrap">
              {sessionData.queryText}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Replay controls */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">优化管道</span>
            <div className="flex items-center gap-1.5">
              {!replayMode ? (
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={startReplay}>
                  <Play className="h-3.5 w-3.5" />
                  回放
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleReplayPause}>
                    {replayPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={replayStep} disabled={replayPlaying}>
                    <SkipForward className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={resetReplay}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <select
                    value={replaySpeed}
                    onChange={e => setReplaySpeed(Number(e.target.value))}
                    className="h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
                  >
                    <option value={2000}>0.5 倍</option>
                    <option value={1000}>1 倍</option>
                    <option value={500}>2 倍</option>
                    <option value={250}>4 倍</option>
                  </select>
                  <Badge variant="secondary" className="text-xs font-mono ml-1">
                    {replayStage + 1}/{normalizedStages.length}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Pipeline */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-4 px-4">
          <StagePipeline
            stages={normalizedStages.map(s => ({
              stage_seq: s.stageSeq,
              stage_name: s.stageName,
              actual_duration_ms: s.durationMs,
              stage_id: s.key,
            }))}
            activeStageSeq={activeStageSeq}
            onStageClick={setActiveStageSeq}
            replayMode={replayMode}
            currentReplayStage={replayMode ? normalizedStages[replayStage]?.stageSeq : undefined}
          />
        </CardContent>
      </Card>

      {/* Stage Detail */}
      {activeStageForDetail && (
        <motion.div
          key={activeStageForDetail.stage_id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <StageDetail stage={activeStageForDetail} />
        </motion.div>
      )}

      {/* Candidate Paths */}
      {normalizedPaths.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Route className="h-4 w-4" />
              候选访问路径
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {normalizedPaths.map(path => (
                <div
                  key={path.key}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    path.isSelected
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/10 border-border/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        path.isSelected ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    />
                    <div>
                      <p className={`text-sm font-mono ${path.isSelected ? "text-primary font-medium" : "text-foreground/70"}`}>
                        {path.pathType}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{path.pathDescription}</p>
                    </div>
                    {path.isSelected && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        最优
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                    <span>成本：{path.totalCost.toFixed(2)}</span>
                    <span>启动：{path.startupCost.toFixed(2)}</span>
                    <span>行数：{path.rowsEstimate}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duration breakdown */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Timer className="h-4 w-4" />
            耗时细分
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {normalizedStages.map(stage => {
              const totalMs = sessionData.totalDurationMs ?? 0;
              const pct = totalMs > 0
                ? (stage.durationMs / totalMs) * 100
                : 0;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 capitalize">
                    {stage.stageName.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="h-full bg-primary/60 rounded-full"
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-16 text-right">
                    {stage.durationMs.toFixed(1)}ms
                  </span>
                  <span className="text-xs font-mono text-muted-foreground/60 w-12 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-mono text-foreground/90">{value}</p>
      </div>
    </div>
  );
}
