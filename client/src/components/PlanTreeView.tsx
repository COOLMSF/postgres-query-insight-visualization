import { type PlanNode } from "@/lib/mockData";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

const NODE_COLORS: Record<string, string> = {
  "Seq Scan": "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  "Index Scan": "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
  "Index Only Scan": "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
  "Bitmap Index Scan": "from-teal-500/20 to-teal-500/5 border-teal-500/30",
  "Bitmap Heap Scan": "from-teal-500/20 to-teal-500/5 border-teal-500/30",
  "BitmapAnd": "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
  "BitmapOr": "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
  "Nested Loop": "from-blue-500/20 to-blue-500/5 border-blue-500/30",
  "Hash Join": "from-violet-500/20 to-violet-500/5 border-violet-500/30",
  "Merge Join": "from-purple-500/20 to-purple-500/5 border-purple-500/30",
  "Sort": "from-rose-500/20 to-rose-500/5 border-rose-500/30",
  "HashAggregate": "from-pink-500/20 to-pink-500/5 border-pink-500/30",
  "GroupAggregate": "from-pink-500/20 to-pink-500/5 border-pink-500/30",
  "Limit": "from-sky-500/20 to-sky-500/5 border-sky-500/30",
  "Result": "from-gray-500/20 to-gray-500/5 border-gray-500/30",
  "Hash": "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30",
  "Materialize": "from-orange-500/20 to-orange-500/5 border-orange-500/30",
};

const NODE_ICON_COLORS: Record<string, string> = {
  "Seq Scan": "text-amber-400",
  "Index Scan": "text-emerald-400",
  "Index Only Scan": "text-emerald-400",
  "Bitmap Index Scan": "text-teal-400",
  "Bitmap Heap Scan": "text-teal-400",
  "BitmapAnd": "text-cyan-400",
  "Nested Loop": "text-blue-400",
  "Hash Join": "text-violet-400",
  "Merge Join": "text-purple-400",
  "Sort": "text-rose-400",
  "HashAggregate": "text-pink-400",
  "GroupAggregate": "text-pink-400",
  "Limit": "text-sky-400",
};

function getNodeColor(type: string): string {
  return NODE_COLORS[type] || "from-gray-500/20 to-gray-500/5 border-gray-500/30";
}

function getIconColor(type: string): string {
  return NODE_ICON_COLORS[type] || "text-gray-400";
}

function getCostBarWidth(cost: number, maxCost: number): number {
  if (maxCost === 0) return 0;
  return Math.max(5, Math.min(100, (cost / maxCost) * 100));
}

function findMaxCost(node: PlanNode): number {
  let max = node.cost;
  for (const child of node.children) {
    max = Math.max(max, findMaxCost(child));
  }
  return max;
}

interface TreeNodeProps {
  node: PlanNode;
  maxCost: number;
  depth: number;
  isLast: boolean;
}

function TreeNodeComponent({ node, maxCost, depth, isLast }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const costWidth = getCostBarWidth(node.cost, maxCost);
  const colorClass = getNodeColor(node.type);
  const iconColor = getIconColor(node.type);

  return (
    <div className="relative">
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 w-6 h-5 border-l-2 border-b-2 border-border/40 rounded-bl-lg" style={{ marginLeft: "-1px" }} />
      )}

      <div className={`ml-${depth > 0 ? "6" : "0"}`}>
        {/* Node card */}
        <div
          className={`tree-node relative rounded-lg border bg-gradient-to-r ${colorClass} p-3 mb-2 cursor-pointer transition-all hover:scale-[1.01]`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start gap-3">
            {/* Expand/Collapse */}
            <div className="mt-0.5 shrink-0">
              {hasChildren ? (
                expanded ? (
                  <ChevronDown className={`h-4 w-4 ${iconColor}`} />
                ) : (
                  <ChevronRight className={`h-4 w-4 ${iconColor}`} />
                )
              ) : (
                <div className={`h-4 w-4 rounded-full border-2 ${iconColor.replace("text-", "border-")} opacity-50`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-semibold text-sm ${iconColor}`}>{node.type}</span>
                {node.details?.["Relation Name"] && (
                  <span className="text-xs text-muted-foreground font-mono">
                    on {node.details["Relation Name"] as string}
                    {node.details?.["Alias"] && node.details["Alias"] !== node.details["Relation Name"]
                      ? ` (${node.details["Alias"]})`
                      : ""}
                  </span>
                )}
              </div>

              {/* Index info */}
              {node.details?.["Index Name"] && (
                <div className="text-xs text-muted-foreground mb-1">
                  using <span className="font-mono text-foreground/70">{node.details["Index Name"] as string}</span>
                </div>
              )}

              {/* Filter/Condition */}
              {(node.details?.["Index Cond"] || node.details?.["Filter"] || node.details?.["Recheck Cond"] || node.details?.["Join Type"]) && (
                <div className="text-xs font-mono text-muted-foreground mb-2 bg-background/30 rounded px-2 py-1">
                  {node.details?.["Join Type"] && <span>Join: {node.details["Join Type"] as string} </span>}
                  {node.details?.["Index Cond"] && <span>Cond: {node.details["Index Cond"] as string} </span>}
                  {node.details?.["Filter"] && <span>Filter: {node.details["Filter"] as string} </span>}
                  {node.details?.["Recheck Cond"] && <span>Recheck: {node.details["Recheck Cond"] as string}</span>}
                </div>
              )}

              {/* Cost bar */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Cost:</span>
                  <div className="w-24 h-1.5 bg-background/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-current opacity-60"
                      style={{ width: `${costWidth}%` }}
                    />
                  </div>
                  <span className="font-mono text-foreground/80">{node.cost.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Rows:</span>
                  <span className="font-mono text-foreground/80">{node.rows.toLocaleString()}</span>
                </div>
                {node.width !== undefined && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Width:</span>
                    <span className="font-mono text-foreground/80">{node.width}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && expanded && (
          <div className="ml-4 pl-4 border-l-2 border-border/20">
            {node.children.map((child, i) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                maxCost={maxCost}
                depth={depth + 1}
                isLast={i === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlanTreeView({ root }: { root: PlanNode }) {
  const maxCost = useMemo(() => findMaxCost(root), [root]);

  return (
    <div className="p-4">
      <TreeNodeComponent node={root} maxCost={maxCost} depth={0} isLast={true} />
    </div>
  );
}
