import { type TracePath } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Route, CheckCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

interface CandidatePathsChartProps {
  paths: TracePath[];
}

export default function CandidatePathsChart({ paths }: CandidatePathsChartProps) {
  const maxCost = useMemo(() => Math.max(...paths.map(p => p.total_cost), 1), [paths]);
  const sortedPaths = useMemo(() => [...paths].sort((a, b) => a.total_cost - b.total_cost), [paths]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Route className="h-4 w-4" />
          Candidate Access Paths ({paths.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedPaths.map((path, idx) => {
            const costPct = (path.total_cost / maxCost) * 100;
            const isSelected = path.is_selected;

            return (
              <motion.div
                key={path.path_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative rounded-lg border p-4 transition-all ${
                  isSelected
                    ? "bg-primary/5 border-primary/30 shadow-sm shadow-primary/5"
                    : "bg-muted/5 border-border/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={`text-sm font-mono ${isSelected ? "text-primary font-semibold" : "text-foreground/70"}`}>
                      {path.path_type}
                    </span>
                    {isSelected && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        Optimal Path
                      </Badge>
                    )}
                  </div>
                  <span className={`text-sm font-mono ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    {path.total_cost.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-3 ml-6">
                  {path.path_description}
                </p>

                {/* Cost bar */}
                <div className="ml-6">
                  <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${costPct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.1 }}
                      className={`h-full rounded-full ${
                        isSelected ? "bg-primary/50" : "bg-muted-foreground/20"
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                    <span>Startup: {path.startup_cost.toFixed(2)}</span>
                    <span>Rows: {path.rows_estimate.toLocaleString()}</span>
                    <span>Rel: {path.parent_rel}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
