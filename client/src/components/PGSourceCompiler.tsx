import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Database,
  Download,
  FileCode,
  GitBranch,
  Settings,
  Hammer,
  CheckCircle2,
  Loader2,
  Terminal,
  Cpu,
  HardDrive,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Package,
  Shield,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// 编译步骤定义
const COMPILE_STEPS = [
  {
    id: "download",
    title: "下载 PostgreSQL 源码",
    icon: Download,
    description: "从官方镜像源下载 PostgreSQL 14.10 源码包",
    command: "wget https://ftp.postgresql.org/pub/source/v14.10/postgresql-14.10.tar.gz",
    duration: 3000,
  },
  {
    id: "extract",
    title: "解压源码包",
    icon: Package,
    description: "解压源码包到编译目录",
    command: "tar -xzf postgresql-14.10.tar.gz && cd postgresql-14.10",
    duration: 2000,
  },
  {
    id: "patch",
    title: "应用优化器追踪补丁",
    icon: FileCode,
    description: "应用 pg_query_optimizer_tracer 扩展补丁到源码",
    command: "patch -p1 < pg_query_optimizer_tracer.patch",
    duration: 2500,
    subSteps: [
      "备份原始文件...",
      "修改 src/backend/optimizer/plan/planner.c...",
      "修改 src/backend/executor/execMain.c...",
      "修改 src/backend/parser/analyze.c...",
      "添加钩子函数声明到 include/optimizer/planner.h...",
      "补丁应用完成！",
    ],
  },
  {
    id: "configure",
    title: "配置编译选项",
    icon: Settings,
    description: "运行 configure 脚本配置编译参数",
    command: "./configure --prefix=/usr/local/pgsql --with-openssl --enable-debug",
    duration: 4000,
  },
  {
    id: "compile",
    title: "编译源代码",
    icon: Hammer,
    description: "编译 PostgreSQL 核心模块和扩展",
    command: "make -j$(nproc) world",
    duration: 8000,
    subSteps: [
      "编译 src/port 模块...",
      "编译 src/common 模块...",
      "编译 src/backend 模块...",
      "编译优化器模块 (optimizer)...",
      "编译执行器模块 (executor)...",
      "编译解析器模块 (parser)...",
      "编译 pg_query_optimizer_tracer 扩展...",
      "编译完成！",
    ],
  },
  {
    id: "install",
    title: "安装到系统",
    icon: HardDrive,
    description: "安装编译好的二进制文件到系统目录",
    command: "sudo make install-world",
    duration: 3000,
  },
  {
    id: "initdb",
    title: "初始化数据库",
    icon: Database,
    description: "初始化数据库集群并注册扩展",
    command: "initdb -D /usr/local/pgsql/data && psql -c \"CREATE EXTENSION pg_query_optimizer_tracer;\"",
    duration: 3500,
  },
  {
    id: "verify",
    title: "验证安装",
    icon: CheckCircle2,
    description: "验证扩展功能和钩子状态",
    command: "psql -c \"SELECT pg_tracer_is_enabled();\" -c \"SELECT * FROM pg_extension WHERE extname = 'pg_query_optimizer_tracer';\"",
    duration: 2000,
  },
];

interface CompileStepStatus {
  stepId: string;
  status: "pending" | "running" | "completed" | "error";
  progress: number;
  output: string[];
}

export default function PGSourceCompiler() {
  const [isCompiling, setIsCompiling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<CompileStepStatus[]>(
    COMPILE_STEPS.map(step => ({
      stepId: step.id,
      status: "pending",
      progress: 0,
      output: [],
    }))
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [totalProgress, setTotalProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stepStatuses]);

  const startCompilation = async () => {
    setIsCompiling(true);
    setIsPaused(false);
    setTotalProgress(0);
    
    // 重置所有步骤状态
    setStepStatuses(
      COMPILE_STEPS.map(step => ({
        stepId: step.id,
        status: "pending",
        progress: 0,
        output: [],
      }))
    );

    toast.info("开始编译 PostgreSQL 源码...", {
      description: "这可能需要几分钟时间",
    });

    // 依次执行每个步骤
    for (let i = 0; i < COMPILE_STEPS.length; i++) {
      setCurrentStepIndex(i);
      const step = COMPILE_STEPS[i];
      
      // 更新当前步骤为运行中
      setStepStatuses(prev =>
        prev.map(s =>
          s.stepId === step.id
            ? { ...s, status: "running", output: [`$ ${step.command}`] }
            : s
        )
      );

      // 模拟子步骤输出
      if (step.subSteps) {
        const subStepDelay = step.duration / step.subSteps.length;
        for (let j = 0; j < step.subSteps.length; j++) {
          await new Promise(resolve => setTimeout(resolve, subStepDelay));
          if (isPaused) {
            await waitForResume();
          }
          setStepStatuses(prev =>
            prev.map(s =>
              s.stepId === step.id
                ? {
                    ...s,
                    output: [...s.output, step.subSteps![j]],
                    progress: ((j + 1) / step.subSteps!.length) * 100,
                  }
                : s
            )
          );
        }
      } else {
        // 模拟进度更新
        const progressInterval = setInterval(() => {
          setStepStatuses(prev =>
            prev.map(s =>
              s.stepId === step.id
                ? { ...s, progress: Math.min(s.progress + 10, 90) }
                : s
            )
          );
        }, step.duration / 10);

        await new Promise(resolve => setTimeout(resolve, step.duration));
        clearInterval(progressInterval);
      }

      // 标记步骤完成
      setStepStatuses(prev =>
        prev.map(s =>
          s.stepId === step.id
            ? { ...s, status: "completed", progress: 100, output: [...s.output, "✓ 完成"] }
            : s
        )
      );

      // 更新总进度
      setTotalProgress(((i + 1) / COMPILE_STEPS.length) * 100);
    }

    setIsCompiling(false);
    setCurrentStepIndex(-1);
    toast.success("PostgreSQL 源码编译完成！", {
      description: "扩展已成功安装并启用",
    });
  };

  const waitForResume = (): Promise<void> => {
    return new Promise(resolve => {
      const checkResume = setInterval(() => {
        if (!isPaused) {
          clearInterval(checkResume);
          resolve();
        }
      }, 100);
    });
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      toast.info("继续编译");
    } else {
      toast.info("编译已暂停");
    }
  };

  const resetCompilation = () => {
    setIsCompiling(false);
    setIsPaused(false);
    setCurrentStepIndex(-1);
    setTotalProgress(0);
    setStepStatuses(
      COMPILE_STEPS.map(step => ({
        stepId: step.id,
        status: "pending",
        progress: 0,
        output: [],
      }))
    );
    toast.info("已重置编译进度");
  };

  const getStepIcon = (status: CompileStepStatus["status"], Icon: any) => {
    if (status === "completed") {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (status === "running") {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    if (status === "error") {
      return <Shield className="h-5 w-5 text-red-500" />;
    }
    return <Icon className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: CompileStepStatus["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">完成</Badge>;
      case "running":
        return <Badge variant="secondary">进行中</Badge>;
      case "error":
        return <Badge variant="destructive">错误</Badge>;
      default:
        return <Badge variant="outline">等待中</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PostgreSQL 源码编译</h1>
          <p className="text-muted-foreground mt-1">
            自动下载、补丁、编译并安装带有优化器追踪功能的 PostgreSQL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Database className="h-3 w-3" />
            PostgreSQL 14.10
          </Badge>
          <Badge variant="outline" className="gap-1">
            <GitBranch className="h-3 w-3" />
            pg_query_optimizer_tracer v1.0.0
          </Badge>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            编译控制
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {!isCompiling ? (
              <Button onClick={startCompilation} className="gap-2">
                <Play className="h-4 w-4" />
                开始编译
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={togglePause} className="gap-2">
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4" />
                      继续
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" />
                      暂停
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetCompilation} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  重置
                </Button>
              </>
            )}

            {isCompiling && (
              <div className="flex-1 flex items-center gap-3">
                <Progress value={totalProgress} className="flex-1" />
                <span className="text-sm font-medium w-16 text-right">
                  {totalProgress.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="grid gap-4">
        {COMPILE_STEPS.map((step, index) => {
          const status = stepStatuses.find(s => s.stepId === step.id);
          const isCurrentStep = index === currentStepIndex;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={isCurrentStep ? "border-blue-500/50" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStepIcon(status?.status || "pending", step.icon)}
                      <div>
                        <CardTitle className="text-base">{step.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    {status && getStatusBadge(status.status)}
                  </div>
                </CardHeader>
                {status && status.output.length > 0 && (
                  <CardContent>
                    <div className="bg-muted/50 rounded-md p-3 font-mono text-xs">
                      <ScrollArea className="h-24" ref={isCurrentStep ? scrollRef : undefined}>
                        <AnimatePresence>
                          {status.output.map((line, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-2 py-0.5"
                            >
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <span className={line.startsWith("✓") ? "text-green-500" : ""}>
                                {line}
                              </span>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </ScrollArea>
                    </div>
                    {status.progress > 0 && status.progress < 100 && (
                      <Progress value={status.progress} className="mt-2 h-1" />
                    )}
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Cpu className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-sm font-medium">CPU 优化</div>
                <div className="text-xs text-muted-foreground">
                  使用 -O3 优化级别
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-sm font-medium">安全补丁</div>
                <div className="text-xs text-muted-foreground">
                  包含最新安全更新
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-sm font-medium">性能增强</div>
                <div className="text-xs text-muted-foreground">
                  优化器追踪功能
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
