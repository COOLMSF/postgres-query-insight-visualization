import { STAGE_CONFIG } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { FileCode, Search, RefreshCw, Route, FileText, Play, CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const STAGE_ICONS: Record<string, React.ElementType> = {
  parse: FileCode,
  analyze: Search,
  rewrite: RefreshCw,
  plan: Route,
  explain: FileText,
  execute_start: Play,
  execute_end: CheckCircle,
};

interface PipelineStage {
  stage_seq: number;
  stage_name: string;
  actual_duration_ms: number;
  stage_id?: number;
}

interface StagePipelineProps {
  stages: PipelineStage[];
  activeStageSeq: number | null;
  onStageClick: (stageSeq: number) => void;
  replayMode?: boolean;
  currentReplayStage?: number;
}

export default function StagePipeline({
  stages,
  activeStageSeq,
  onStageClick,
  replayMode = false,
  currentReplayStage = -1,
}: StagePipelineProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 px-1">
      {stages.map((stage, index) => {
        const config = STAGE_CONFIG[stage.stage_name] || {
          label: stage.stage_name,
          color: "#6b7280",
          description: "",
        };
        const Icon = STAGE_ICONS[stage.stage_name] || FileCode;
        const isActive = activeStageSeq === stage.stage_seq;
        const isCompleted = replayMode
          ? stage.stage_seq <= currentReplayStage
          : true;
        const isPending = replayMode && stage.stage_seq > currentReplayStage;

        return (
          <div key={stage.stage_id ?? stage.stage_seq} className="flex items-center shrink-0">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => onStageClick(stage.stage_seq)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all duration-200 min-w-[90px]",
                "border",
                isActive
                  ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10"
                  : isPending
                    ? "bg-muted/30 border-border/30 opacity-50"
                    : "bg-card/50 border-border/50 hover:bg-card hover:border-border",
              )}
            >
              {/* Stage icon */}
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                  isActive
                    ? "bg-primary/20"
                    : isCompleted
                      ? "bg-muted/50"
                      : "bg-muted/20",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-primary" : isCompleted ? "text-foreground/60" : "text-muted-foreground/40",
                  )}
                />
              </div>

              {/* Stage label */}
              <span
                className={cn(
                  "text-[11px] font-medium leading-tight",
                  isActive ? "text-primary" : isCompleted ? "text-foreground/80" : "text-muted-foreground/40",
                )}
              >
                {config.label}
              </span>

              {/* Duration badge */}
              {stage.actual_duration_ms > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    isActive ? "text-primary/70" : "text-muted-foreground/60",
                  )}
                >
                  {stage.actual_duration_ms.toFixed(1)}ms
                </span>
              )}

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeStage"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"
                />
              )}
            </motion.button>

            {/* Arrow connector */}
            {index < stages.length - 1 && (
              <ArrowRight
                className={cn(
                  "h-3.5 w-3.5 mx-0.5 shrink-0",
                  isCompleted && !isPending ? "text-muted-foreground/40" : "text-muted-foreground/20",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
