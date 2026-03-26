import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StagePipeline from "@/components/StagePipeline";
import StageDetail from "@/components/StageDetail";
import {
  DEMO_SESSIONS,
  DEMO_STAGES,
  DEMO_PATHS,
  type TraceSession,
  type TraceStage,
  getMockSessionDetail,
} from "@/lib/mockData";
import { useQueryAnalyzer } from "@/hooks/useQueryAnalyzer";
import type { QuerySession, OptimizationStage, ExecutionPath } from "../../../shared/queryTypes";
import {
  Database,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Clock,
  Zap,
  Layers,
  Search,
  ChevronRight,
  Activity,
  Timer,
  Hash,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hammer,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// SQL sample queries
const SAMPLE_QUERIES = [
  {
    label: "Join Query",
    sql: "SELECT e.name, e.salary, d.name AS dept_name\nFROM demo_employees e\nJOIN demo_departments d ON e.department_id = d.id\nWHERE e.salary > 60000\nORDER BY e.salary DESC\nLIMIT 10",
  },
  {
    label: "Aggregation",
    sql: "SELECT department, COUNT(*) as cnt,\n  AVG(salary) as avg_salary,\n  MAX(salary) as max_salary\nFROM demo_employees\nGROUP BY department\nHAVING COUNT(*) > 100\nORDER BY avg_salary DESC",
  },
  {
    label: "Filter Query",
    sql: "SELECT * FROM demo_employees\nWHERE department = 'Engineering'\n  AND salary BETWEEN 50000 AND 80000",
  },
  {
    label: "Left Join",
    sql: "SELECT d.name, COUNT(e.id) as emp_count,\n  SUM(e.salary) as total_salary\nFROM demo_departments d\nLEFT JOIN demo_employees e\n  ON d.department_id = e.id\nGROUP BY d.name",
  },
];

type DataMode = "mock" | "realtime";

export default function Home() {
  const [, setLocation] = useLocation();
  const [sqlInput, setSqlInput] = useState(SAMPLE_QUERIES[0].sql);
  const [dataMode, setDataMode] = useState<DataMode>("mock");
  
  // Mock mode state
  const [selectedSession, setSelectedSession] = useState<TraceSession | null>(null);
  const [stages, setStages] = useState<TraceStage[]>([]);
  const [activeStageSeq, setActiveStageSeq] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Real-time mode state
  const [realtimeSession, setRealtimeSession] = useState<QuerySession | null>(null);
  const [realtimeStages, setRealtimeStages] = useState<OptimizationStage[]>([]);
  const [realtimePaths, setRealtimePaths] = useState<ExecutionPath[]>([]);
  
  // Replay state
  const [replayMode, setReplayMode] = useState(false);
  const [replayStage, setReplayStage] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tRPC hooks for real-time mode
  const { analyze, testConnection } = useQueryAnalyzer();

  // Check database connection on mount
  useEffect(() => {
    if (dataMode === "realtime") {
      testConnection.refetch();
    }
  }, [dataMode, testConnection]);

  // Clear timers on unmount to avoid stale async updates
  useEffect(() => {
    return () => {
      if (analyzeTimerRef.current) {
        clearInterval(analyzeTimerRef.current);
        analyzeTimerRef.current = null;
      }
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, []);

  // Active stage state - computed via effect to avoid render-time issues
  const [activeStage, setActiveStage] = useState<TraceStage | null>(null);
  const [realtimeActiveStage, setRealtimeActiveStage] = useState<OptimizationStage | null>(null);

  // Update active stage when dependencies change
  useEffect(() => {
    // Find mock mode active stage
    let foundMock: TraceStage | null = null;
    if (activeStageSeq != null && stages.length > 0) {
      for (let i = 0; i < stages.length; i++) {
        if (stages[i].stage_seq === activeStageSeq) {
          foundMock = stages[i];
          break;
        }
      }
    }
    setActiveStage(foundMock);

    // Find realtime mode active stage
    let foundRealtime: OptimizationStage | null = null;
    if (activeStageSeq != null && realtimeStages.length > 0) {
      for (let i = 0; i < realtimeStages.length; i++) {
        if (realtimeStages[i].stageSeq === activeStageSeq) {
          foundRealtime = realtimeStages[i];
          break;
        }
      }
    }
    setRealtimeActiveStage(foundRealtime);
  }, [activeStageSeq, stages, realtimeStages]);

  // Handle query analysis
  const handleAnalyze = useCallback(() => {
    if (!sqlInput.trim()) {
      toast.error("请输入 SQL 查询");
      return;
    }

    if (dataMode === "mock") {
      // Mock mode - use demo data
      setIsAnalyzing(true);
      setReplayMode(false);
      setReplayPlaying(false);

      const matchIdx = SAMPLE_QUERIES.findIndex(q =>
        sqlInput.trim().replace(/\s+/g, " ") === q.sql.replace(/\s+/g, " ")
      );
      const sessionIdx = matchIdx >= 0 ? matchIdx : 0;
      const session = DEMO_SESSIONS[sessionIdx];
      const sessionStages = DEMO_STAGES[session.session_id] || [];

      setStages([]);
      setSelectedSession(session);
      setActiveStageSeq(null);

      if (analyzeTimerRef.current) {
        clearInterval(analyzeTimerRef.current);
        analyzeTimerRef.current = null;
      }

      let stageIdx = 0;
      analyzeTimerRef.current = setInterval(() => {
        if (stageIdx < sessionStages.length) {
          const nextStage = sessionStages[stageIdx];
          if (nextStage) {
            setStages(prev => [...prev, nextStage]);
            setActiveStageSeq(nextStage.stage_seq);
          }
          stageIdx++;
        } else {
          if (analyzeTimerRef.current) {
            clearInterval(analyzeTimerRef.current);
            analyzeTimerRef.current = null;
          }
          setIsAnalyzing(false);
          toast.success("查询优化分析完成", {
            description: `${sessionStages.length} 个阶段，耗时${session.total_duration_ms}毫秒`,
          });
        }
      }, 200);
    } else {
      // Real-time mode - use PostgreSQL
      analyze.mutate(
        { sql: sqlInput, databaseName: "postgres" },
        {
          onSuccess: (response) => {
            if (response.success) {
              const { session, stages, paths } = response.data;
              setRealtimeSession(session);
              setRealtimeStages(stages);
              setRealtimePaths(paths);
              setActiveStageSeq(stages[0]?.stageSeq || null);
              toast.success("查询优化分析完成", {
                description: `${stages.length} 个阶段，耗时${session.totalDurationMs?.toFixed(2) || 0}毫秒`,
              });
            }
          },
          onError: (error) => {
            toast.error("分析失败", {
              description: error.message,
            });
          },
        }
      );
    }
  }, [sqlInput, dataMode, analyze]);

  // Replay controls
  const startReplay = useCallback(() => {
    if (dataMode === "mock") {
      if (stages.length === 0) return;
      setReplayMode(true);
      setReplayStage(0);
      setReplayPlaying(true);
      setActiveStageSeq(stages[0].stage_seq);
    } else {
      if (realtimeStages.length === 0) return;
      setReplayMode(true);
      setReplayStage(0);
      setReplayPlaying(true);
      setActiveStageSeq(realtimeStages[0].stageSeq);
    }
  }, [stages, realtimeStages, dataMode]);

  const toggleReplayPause = useCallback(() => {
    setReplayPlaying(prev => !prev);
  }, []);

  const replayStep = useCallback(() => {
    if (dataMode === "mock") {
      setReplayStage(prev => {
        const next = Math.min(prev + 1, stages.length - 1);
        const nextStage = stages[next];
        if (nextStage) {
          setActiveStageSeq(nextStage.stage_seq);
        }
        return next;
      });
    } else {
      setReplayStage(prev => {
        const next = Math.min(prev + 1, realtimeStages.length - 1);
        const nextStage = realtimeStages[next];
        if (nextStage) {
          setActiveStageSeq(nextStage.stageSeq);
        }
        return next;
      });
    }
  }, [stages, realtimeStages, dataMode]);

  const resetReplay = useCallback(() => {
    setReplayMode(false);
    setReplayPlaying(false);
    setReplayStage(0);
    if (dataMode === "mock") {
      if (stages.length > 0) {
        setActiveStageSeq(stages[0].stage_seq);
      }
    } else {
      if (realtimeStages.length > 0) {
        setActiveStageSeq(realtimeStages[0].stageSeq);
      }
    }
  }, [stages, realtimeStages, dataMode]);

  useEffect(() => {
    if (replayPlaying && replayMode) {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);

      replayTimerRef.current = setInterval(() => {
        if (dataMode === "mock") {
          setReplayStage(prev => {
            if (prev >= stages.length - 1) {
              setReplayPlaying(false);
              return prev;
            }
            const next = prev + 1;
            const nextStage = stages[next];
            if (nextStage) {
              setActiveStageSeq(nextStage.stage_seq);
            }
            return next;
          });
        } else {
          setReplayStage(prev => {
            if (prev >= realtimeStages.length - 1) {
              setReplayPlaying(false);
              return prev;
            }
            const next = prev + 1;
            const nextStage = realtimeStages[next];
            if (nextStage) {
              setActiveStageSeq(nextStage.stageSeq);
            }
            return next;
          });
        }
      }, replaySpeed);
    } else if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayPlaying, replayMode, replaySpeed, stages, realtimeStages, dataMode]);

  const currentSession = dataMode === "mock" ? selectedSession : realtimeSession;
  const currentStages = useMemo(
    () =>
      (dataMode === "mock" ? stages : realtimeStages).filter(
        (stage): stage is NonNullable<typeof stage> => stage != null
      ),
    [dataMode, stages, realtimeStages]
  );
  const currentPaths = dataMode === "mock" ? DEMO_PATHS[(currentSession as any)?.session_id ?? 1] || [] : realtimePaths;
  const displayActiveStage = dataMode === "mock" ? activeStage : realtimeActiveStage;
  const displayActiveStageForDetail = dataMode === "mock" ? activeStage : null; // StageDetail only works with TraceStage for now

  const isDbConnected = testConnection.data?.success ?? false;
  const isAnalyzingRealtime = analyze.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">查询分析器</h1>
          <p className="text-muted-foreground mt-1">
            输入 SQL 查询，可视化 PostgreSQL 查询优化过程
          </p>
        </div>

        {/* Data mode toggle and PG Source button */}
        <div className="flex items-center gap-2">
          {/* PG Source Compile Button */}
          <Button
            variant="outline"
            onClick={() => setLocation("/pg-source")}
            className="gap-2 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10"
          >
            <Hammer className="h-4 w-4 text-purple-400" />
            <span className="hidden sm:inline">PG 源码编译</span>
            <Badge className="h-5 text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30">
              源码级
            </Badge>
          </Button>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-card">
            <Button
              variant={dataMode === "mock" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDataMode("mock")}
              className="h-8"
            >
              <Zap className="h-4 w-4 mr-1" />
              模拟模式
            </Button>
            <Button
              variant={dataMode === "realtime" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDataMode("realtime")}
              className="h-8"
              disabled={analyze.isPending}
            >
              {isDbConnected ? (
                <Wifi className="h-4 w-4 mr-1" />
              ) : (
                <WifiOff className="h-4 w-4 mr-1" />
              )}
              实时模式
            </Button>
          </div>
          
          {dataMode === "realtime" && (
            <Badge variant={isDbConnected ? "default" : "destructive"} className="h-8">
              {isDbConnected ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" />已连接</>
              ) : (
                <><AlertCircle className="h-3 w-3 mr-1" />未连接</>
              )}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SQL Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              SQL 查询
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>示例查询</Label>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUERIES.map((query, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setSqlInput(query.sql)}
                    className="text-xs"
                  >
                    {query.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sql-input">SQL 语句</Label>
              <div className="relative">
                <textarea
                  id="sql-input"
                  value={sqlInput}
                  onChange={(e) => setSqlInput(e.target.value)}
                  className="w-full min-h-[200px] p-3 font-mono text-sm resize-none border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="输入 SQL 查询..."
                />
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isAnalyzingRealtime || !sqlInput.trim()}
              className="w-full"
            >
              {isAnalyzing || isAnalyzingRealtime ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  开始分析
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Replay Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              回放控制
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={startReplay}
                disabled={currentStages.length === 0 || replayMode}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                开始回放
              </Button>
              <Button
                variant="outline"
                onClick={toggleReplayPause}
                disabled={!replayMode || currentStages.length === 0}
              >
                {replayPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    暂停
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    继续
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={replayStep}
                disabled={!replayMode || currentStages.length === 0}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                单步
              </Button>
              <Button
                variant="outline"
                onClick={resetReplay}
                disabled={!replayMode && currentStages.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重置
              </Button>
            </div>

            {replayMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">回放进度</span>
                  <span className="font-medium">
                    {replayStage + 1} / {currentStages.length}
                  </span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="absolute left-0 top-0 h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: ((replayStage + 1) / currentStages.length) * 100 + "%" }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">回放速度</span>
                <span className="font-medium">{replaySpeed}ms</span>
              </div>
              <Input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={replaySpeed}
                onChange={(e) => setReplaySpeed(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>快</span>
                <span>慢</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {currentSession && currentStages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  优化分析结果
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Hash className="h-3 w-3 mr-1" />
                    {dataMode === "mock" ? `#${(currentSession as TraceSession).session_id}` : `ID: ${(currentSession as QuerySession).id}`}
                  </Badge>
                  <Badge variant={currentSession.status === "completed" ? "default" : "secondary"}>
                    {currentSession.status === "completed" ? "已完成" : currentSession.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Session info bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Timer className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">总耗时</div>
                    <div className="font-mono font-medium">
                      {dataMode === "mock" 
                        ? `${(currentSession as TraceSession).total_duration_ms}毫秒`
                        : `${(currentSession as QuerySession).totalDurationMs?.toFixed(2) || 0}毫秒`
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">阶段数</div>
                    <div className="font-mono font-medium">
                      {dataMode === "mock"
                        ? (currentSession as TraceSession).total_stages
                        : (currentSession as QuerySession).totalStages
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">数据库</div>
                    <div className="font-mono font-medium">
                      {dataMode === "mock"
                        ? (currentSession as TraceSession).database_name
                        : (currentSession as QuerySession).databaseName
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">开始时间</div>
                    <div className="font-mono text-xs">
                      {new Date(
                        dataMode === "mock"
                          ? (currentSession as TraceSession).start_time
                          : (currentSession as QuerySession).startTime
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage Pipeline */}
              <StagePipeline
                stages={currentStages.map(s => ({
                  stage_seq: (s as any).stage_seq ?? (s as any).stageSeq,
                  stage_name: (s as any).stage_name ?? (s as any).stageName,
                  actual_duration_ms: (s as any).duration_ms ?? (s as any).durationMs ?? 0,
                  stage_id: (s as any).stage_id,
                }))}
                activeStageSeq={activeStageSeq}
                onStageClick={(seq) => setActiveStageSeq(seq)}
              />

              {/* Stage Detail */}
              {displayActiveStageForDetail && (
                <StageDetail
                  stage={displayActiveStageForDetail}
                />
              )}

              {/* View full details button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    const sessionId = dataMode === "mock"
                      ? (currentSession as TraceSession).session_id
                      : (currentSession as QuerySession).id;
                    setLocation(`/session/${sessionId}`);
                  }}
                >
                  查看详情
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty state */}
      {!currentSession && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">开始分析 SQL 查询</h3>
            <p className="text-muted-foreground max-w-md">
              输入 SQL 查询并点击"开始分析"按钮，查看 PostgreSQL 查询优化器的完整工作流程
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
