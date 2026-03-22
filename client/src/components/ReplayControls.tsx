import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { type TraceStage, STAGE_CONFIG } from "@/lib/mockData";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Rewind,
  FastForward,
} from "lucide-react";

interface ReplayControlsProps {
  stages: TraceStage[];
  currentStageIndex: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
}

export default function ReplayControls({
  stages,
  currentStageIndex,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onStep,
  onStepBack,
  onReset,
  onSpeedChange,
  onSeek,
}: ReplayControlsProps) {
  const currentStage = stages[currentStageIndex];
  const config = currentStage ? STAGE_CONFIG[currentStage.stage_name] : null;
  const progress = stages.length > 0 ? ((currentStageIndex + 1) / stages.length) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Stage markers */}
        <div className="flex justify-between mt-1">
          {stages.map((stage, idx) => {
            const stageConfig = STAGE_CONFIG[stage.stage_name];
            const isActive = idx === currentStageIndex;
            const isPast = idx < currentStageIndex;
            return (
              <button
                key={stage.stage_id}
                onClick={() => onSeek(idx)}
                className={`relative group`}
                title={stageConfig?.label || stage.stage_name}
              >
                <div
                  className={`h-2 w-2 rounded-full transition-all ${
                    isActive
                      ? "bg-primary scale-150"
                      : isPast
                        ? "bg-primary/50"
                        : "bg-muted-foreground/20"
                  }`}
                />
                <span className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap ${
                  isActive ? "text-primary" : "text-muted-foreground/50"
                }`}>
                  {stageConfig?.label || stage.stage_name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onReset} title="Reset">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onStepBack} disabled={currentStageIndex <= 0} title="Previous stage">
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={isPlaying ? onPause : onPlay}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onStep} disabled={currentStageIndex >= stages.length - 1} title="Next stage">
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {config && (
            <Badge variant="outline" className="text-xs capitalize">
              {config.label}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs font-mono">
            {currentStageIndex + 1} / {stages.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Rewind className="h-3 w-3 text-muted-foreground" />
          <div className="w-20">
            <Slider
              value={[speed]}
              min={250}
              max={3000}
              step={250}
              onValueChange={([v]) => onSpeedChange(v)}
              className="cursor-pointer"
            />
          </div>
          <FastForward className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground w-8">
            {speed < 1000 ? `${(1000 / speed).toFixed(0)}x` : speed === 1000 ? "1x" : `${(1000 / speed).toFixed(1)}x`}
          </span>
        </div>
      </div>
    </div>
  );
}
