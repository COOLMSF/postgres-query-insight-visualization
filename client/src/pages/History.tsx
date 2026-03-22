import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEMO_SESSIONS,
  DEMO_STAGES,
  type TraceSession,
} from "@/lib/mockData";
import {
  Clock,
  Search,
  Database,
  Timer,
  Layers,
  ChevronRight,
  Trash2,
  Download,
  Filter,
  CalendarDays,
  Play,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function History() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredSessions = useMemo(() => {
    let sessions = [...DEMO_SESSIONS];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sessions = sessions.filter(
        s =>
          s.query_text.toLowerCase().includes(q) ||
          s.database_name.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      sessions = sessions.filter(s => s.status === filterStatus);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        sessions.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        break;
      case "oldest":
        sessions.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        break;
      case "fastest":
        sessions.sort((a, b) => a.total_duration_ms - b.total_duration_ms);
        break;
      case "slowest":
        sessions.sort((a, b) => b.total_duration_ms - a.total_duration_ms);
        break;
    }

    return sessions;
  }, [searchQuery, sortBy, filterStatus]);

  const stats = useMemo(() => {
    const total = DEMO_SESSIONS.length;
    const avgDuration =
      DEMO_SESSIONS.reduce((sum, s) => sum + s.total_duration_ms, 0) / total;
    const fastest = Math.min(...DEMO_SESSIONS.map(s => s.total_duration_ms));
    const slowest = Math.max(...DEMO_SESSIONS.map(s => s.total_duration_ms));
    return { total, avgDuration, fastest, slowest };
  }, []);

  const handleExport = (session: TraceSession) => {
    const stages = DEMO_STAGES[session.session_id] || [];
    const exportData = {
      session,
      stages,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session_${session.session_id}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("会话导出成功");
  };

  const handleDelete = (sessionId: number) => {
    toast.info("删除功能在生产模式下可用", {
      description: `会话 #${sessionId} 将从数据库中删除`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            会话历史
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            浏览和管理过去的查询优化会话
          </p>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Database}
          label="总会话数"
          value={String(stats.total)}
          color="text-primary"
        />
        <StatCard
          icon={Timer}
          label="平均耗时"
          value={`${stats.avgDuration.toFixed(1)}毫秒`}
          color="text-amber-400"
        />
        <StatCard
          icon={Layers}
          label="最快"
          value={`${stats.fastest.toFixed(1)}毫秒`}
          color="text-emerald-400"
        />
        <StatCard
          icon={CalendarDays}
          label="最慢"
          value={`${stats.slowest.toFixed(1)}毫秒`}
          color="text-rose-400"
        />
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="按 SQL、数据库或用户搜索..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border/50 h-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/50">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="running">进行中</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/50">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">最新优先</SelectItem>
                <SelectItem value="oldest">最旧优先</SelectItem>
                <SelectItem value="fastest">最快优先</SelectItem>
                <SelectItem value="slowest">最慢优先</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Session list */}
      <AnimatePresence mode="popLayout">
        {filteredSessions.length > 0 ? (
          <div className="space-y-2">
            {filteredSessions.map((session, idx) => (
              <motion.div
                key={session.session_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-border/70 transition-all group">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-4">
                      {/* Session info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-mono text-muted-foreground">
                            #{session.session_id}
                          </span>
                          <Badge
                            variant={
                              session.status === "completed"
                                ? "default"
                                : session.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {session.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(session.start_time).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-mono text-foreground/90 truncate">
                          {session.query_text}
                        </p>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {session.total_duration_ms}ms
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {session.total_stages} stages
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {session.database_name}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setLocation(`/session/${session.session_id}`)}
                          title="查看和回放"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleExport(session)}
                          title="导出"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(session.session_id)}
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => setLocation(`/session/${session.session_id}`)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                未找到符合条件的会话
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
              >
                清除筛选
              </Button>
            </CardContent>
          </Card>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center`}>
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
