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
} from "lucide-react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";

export default function SessionDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const sessionId = Number(params.id);

  const session = DEMO_SESSIONS.find(s => s.session_id === sessionId);
  const stages = DEMO_STAGES[sessionId] || [];
  const paths = DEMO_PATHS[sessionId] || [];

  const [activeStageSeq, setActiveStageSeq] = useState<number | null>(
    stages.length > 0 ? stages[0].stage_seq : null
  );

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

  if (!session) {
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
              会话 #{session.session_id}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              完整优化跟踪视图
            </p>
          </div>
        </div>
        <Badge variant={session.status === "completed" ? "default" : "secondary"}>
          {session.status === "completed" ? "已完成" : session.status}
        </Badge>
      </div>

      {/* Session metadata */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-4 px-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetaItem icon={Timer} label="耗时" value={`${session.total_duration_ms}毫秒`} />
            <MetaItem icon={Layers} label="阶段" value={String(session.total_stages)} />
            <MetaItem icon={Database} label="数据库" value={session.database_name} />
            <MetaItem icon={User} label="用户" value={session.username} />
            <MetaItem icon={Calendar} label="时间" value={new Date(session.start_time).toLocaleString()} />
          </div>
          <Separator className="my-3" />
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">查询</p>
            <pre className="text-sm font-mono text-foreground/90 bg-background/50 rounded-lg p-3 overflow-auto max-h-24 whitespace-pre-wrap">
              {session.query_text}
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
                    {replayStage + 1}/{stages.length}
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

      {/* Candidate Paths */}
      {paths.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Route className="h-4 w-4" />
              候选访问路径
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paths.map(path => (
                <div
                  key={path.path_id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    path.is_selected
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/10 border-border/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        path.is_selected ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    />
                    <div>
                      <p className={`text-sm font-mono ${path.is_selected ? "text-primary font-medium" : "text-foreground/70"}`}>
                        {path.path_type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{path.path_description}</p>
                    </div>
                    {path.is_selected && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        最优
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                    <span>成本：{path.total_cost.toFixed(2)}</span>
                    <span>启动：{path.startup_cost.toFixed(2)}</span>
                    <span>行数：{path.rows_estimate}</span>
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
            {stages.map(stage => {
              const pct = session.total_duration_ms > 0
                ? (stage.actual_duration_ms / session.total_duration_ms) * 100
                : 0;
              return (
                <div key={stage.stage_id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 capitalize">
                    {stage.stage_name.replace(/_/g, " ")}
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
                    {stage.actual_duration_ms.toFixed(1)}ms
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
