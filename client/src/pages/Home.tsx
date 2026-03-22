import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// SQL sample queries
const SAMPLE_QUERIES = [
  {
    label: "Join Query",
    sql: "SELECT e.name, e.salary, d.name AS dept_name\nFROM demo_employees e\nJOIN demo_departments d ON e.department = d.name\nWHERE e.salary > 60000\nORDER BY e.salary DESC\nLIMIT 10",
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
    sql: "SELECT d.name, COUNT(e.id) as emp_count,\n  SUM(e.salary) as total_salary\nFROM demo_departments d\nLEFT JOIN demo_employees e\n  ON d.name = e.department\nGROUP BY d.name",
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [sqlInput, setSqlInput] = useState(SAMPLE_QUERIES[0].sql);
  const [selectedSession, setSelectedSession] = useState<TraceSession | null>(null);
  const [stages, setStages] = useState<TraceStage[]>([]);
  const [activeStageSeq, setActiveStageSeq] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Replay state
  const [replayMode, setReplayMode] = useState(false);
  const [replayStage, setReplayStage] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeStage = useMemo(() => {
    if (activeStageSeq === null) return null;
    return stages.find(s => s.stage_seq === activeStageSeq) || null;
  }, [stages, activeStageSeq]);

  // Simulate query analysis
  const handleAnalyze = useCallback(() => {
    if (!sqlInput.trim()) {
      toast.error("请输入 SQL 查询");
      return;
    }

    setIsAnalyzing(true);
    setReplayMode(false);
    setReplayPlaying(false);

    // Find matching demo session or use first one
    const matchIdx = SAMPLE_QUERIES.findIndex(q =>
      sqlInput.trim().replace(/\s+/g, " ") === q.sql.replace(/\s+/g, " ")
    );
    const sessionIdx = matchIdx >= 0 ? matchIdx : 0;
    const session = DEMO_SESSIONS[sessionIdx];
    const sessionStages = DEMO_STAGES[session.session_id] || [];

    // Animate stages appearing one by one
    setStages([]);
    setSelectedSession(session);
    setActiveStageSeq(null);

    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < sessionStages.length) {
        setStages(prev => [...prev, sessionStages[stageIdx]]);
        setActiveStageSeq(sessionStages[stageIdx].stage_seq);
        stageIdx++;
      } else {
        clearInterval(interval);
        setIsAnalyzing(false);
        toast.success("查询优化分析完成", {
          description: `${sessionStages.length} 个阶段，耗时${session.total_duration_ms}毫秒`,
        });
      }
    }, 200);
  }, [sqlInput]);

  // Replay controls
  const startReplay = useCallback(() => {
    if (stages.length === 0) return;
    setReplayMode(true);
    setReplayStage(0);
    setReplayPlaying(true);
    setActiveStageSeq(stages[0].stage_seq);
  }, [stages]);

  const toggleReplayPause = useCallback(() => {
    setReplayPlaying(prev => !prev);
  }, []);

  const replayStep = useCallback(() => {
    setReplayStage(prev => {
      const next = Math.min(prev + 1, stages.length - 1);
      setActiveStageSeq(stages[next].stage_seq);
      return next;
    });
  }, [stages]);

  const resetReplay = useCallback(() => {
    setReplayMode(false);
    setReplayPlaying(false);
    setReplayStage(0);
    if (stages.length > 0) {
      setActiveStageSeq(stages[0].stage_seq);
    }
  }, [stages]);

  // Replay timer
  useEffect(() => {
    if (replayPlaying && replayMode) {
      replayTimerRef.current = setInterval(() => {
        setReplayStage(prev => {
          if (prev >= stages.length - 1) {
            setReplayPlaying(false);
            return prev;
          }
          const next = prev + 1;
          setActiveStageSeq(stages[next].stage_seq);
          return next;
        });
      }, replaySpeed);
    }
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayPlaying, replayMode, replaySpeed, stages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">查询分析器</h1>
          <p className="text-sm text-muted-foreground mt-1">
            逐步可视化 PostgreSQL 查询优化过程
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            演示模式
          </Badge>
        </div>
      </div>

      {/* SQL Editor Section */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
              SQL 查询输入
            </CardTitle>
            <div className="flex items-center gap-1.5">
              {SAMPLE_QUERIES.map((q, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSqlInput(q.sql)}
                >
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <textarea
              value={sqlInput}
              onChange={e => setSqlInput(e.target.value)}
              className="sql-editor w-full h-32 bg-background/50 border border-border/50 rounded-lg p-4 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              placeholder="在此处输入您的 SQL 查询..."
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>PostgreSQL 14 兼容</span>
                <Separator orientation="vertical" className="h-3" />
                <span>通过 pg_query_tracer 扩展追踪</span>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !sqlInput.trim()}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Activity className="h-4 w-4 animate-pulse" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    分析查询
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <AnimatePresence>
        {selectedSession && stages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Session info bar */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">会话</span>
                      <span className="font-mono font-medium">{selectedSession.session_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">耗时</span>
                      <span className="font-mono font-medium">{selectedSession.total_duration_ms}毫秒</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">阶段</span>
                      <span className="font-mono font-medium">{stages.length}</span>
                    </div>
                    <Badge
                      variant={selectedSession.status === "completed" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {selectedSession.status === "completed" ? "已完成" : selectedSession.status}
                    </Badge>
                  </div>

                  {/* Replay controls */}
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
                          {replayStage + 1}/{stages.length}
                        </Badge>
                      </>
                    )}
                    <Separator orientation="vertical" className="h-5 mx-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8"
                      onClick={() => setLocation(`/session/${selectedSession.session_id}`)}
                    >
                      完整视图
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stage Pipeline */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-4 px-4">
                <StagePipeline
                  stages={stages}
                  activeStage={activeStageSeq}
                  onStageClick={setActiveStageSeq}
                  replayMode={replayMode}
                  currentReplayStage={replayMode ? stages[replayStage]?.stage_seq : undefined}
                />
              </CardContent>
            </Card>

            {/* Stage Detail */}
            {activeStage && (
              <motion.div
                key={activeStage.stage_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <StageDetail stage={activeStage} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Section */}
      {!selectedSession && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              最近会话（演示数据）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DEMO_SESSIONS.map(session => (
                <button
                  key={session.session_id}
                  onClick={() => {
                    setSelectedSession(session);
                    const sessionStages = DEMO_STAGES[session.session_id] || [];
                    setStages(sessionStages);
                    if (sessionStages.length > 0) {
                      setActiveStageSeq(sessionStages[0].stage_seq);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/30 hover:border-border/50 transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-foreground/90 truncate pr-4">
                      {session.query_text}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>#{session.session_id}</span>
                      <span>{session.total_stages} 个阶段</span>
                      <span>{session.total_duration_ms}毫秒</span>
                      <span>{session.database_name}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground/50 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
