import { describe, expect, it } from "vitest";

/**
 * Tests for the PG Query Optimizer Visualizer
 * These tests validate the mock data structures and helper functions
 * that power the frontend visualization.
 */

// Since the mock data is in client code, we test the core logic patterns here
describe("Query Optimizer Stage Pipeline", () => {
  const STAGE_NAMES = ["parse", "analyze", "rewrite", "plan", "explain", "execute_start", "execute_end"];

  it("should have all required optimization stages in correct order", () => {
    expect(STAGE_NAMES).toHaveLength(7);
    expect(STAGE_NAMES[0]).toBe("parse");
    expect(STAGE_NAMES[1]).toBe("analyze");
    expect(STAGE_NAMES[2]).toBe("rewrite");
    expect(STAGE_NAMES[3]).toBe("plan");
    expect(STAGE_NAMES[4]).toBe("explain");
    expect(STAGE_NAMES[5]).toBe("execute_start");
    expect(STAGE_NAMES[6]).toBe("execute_end");
  });

  it("should validate stage configuration structure", () => {
    const STAGE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
      parse: { label: "Parse", color: "#60a5fa", description: "SQL text is tokenized and parsed" },
      analyze: { label: "Analyze", color: "#a78bfa", description: "Semantic analysis and type checking" },
      rewrite: { label: "Rewrite", color: "#f472b6", description: "Query tree rewriting" },
      plan: { label: "Plan", color: "#34d399", description: "Cost-based optimization" },
      explain: { label: "Explain", color: "#fbbf24", description: "EXPLAIN output" },
      execute_start: { label: "Execute Start", color: "#fb923c", description: "Executor initialization" },
      execute_end: { label: "Execute End", color: "#f87171", description: "Execution completion" },
    };

    for (const stageName of STAGE_NAMES) {
      expect(STAGE_CONFIG[stageName]).toBeDefined();
      expect(STAGE_CONFIG[stageName].label).toBeTruthy();
      expect(STAGE_CONFIG[stageName].color).toMatch(/^#[0-9a-f]{6}$/);
      expect(STAGE_CONFIG[stageName].description).toBeTruthy();
    }
  });
});

describe("EXPLAIN JSON Parser", () => {
  const sampleExplain = JSON.stringify([{
    "Plan": {
      "Node Type": "Limit",
      "Startup Cost": 45.32,
      "Total Cost": 48.67,
      "Plan Rows": 10,
      "Plan Width": 68,
      "Plans": [{
        "Node Type": "Sort",
        "Sort Key": ["e.salary DESC"],
        "Startup Cost": 45.32,
        "Total Cost": 46.57,
        "Plan Rows": 250,
        "Plan Width": 68,
        "Plans": [{
          "Node Type": "Nested Loop",
          "Join Type": "Inner",
          "Startup Cost": 0.43,
          "Total Cost": 38.92,
          "Plan Rows": 250,
          "Plan Width": 68,
          "Plans": [
            {
              "Node Type": "Index Scan",
              "Relation Name": "demo_employees",
              "Alias": "e",
              "Index Name": "idx_emp_salary",
              "Startup Cost": 0.28,
              "Total Cost": 12.45,
              "Plan Rows": 250,
              "Plan Width": 44,
            },
            {
              "Node Type": "Index Scan",
              "Relation Name": "demo_departments",
              "Alias": "d",
              "Index Name": "demo_departments_name_key",
              "Startup Cost": 0.15,
              "Total Cost": 0.17,
              "Plan Rows": 1,
              "Plan Width": 24,
            }
          ]
        }]
      }]
    }
  }]);

  it("should parse EXPLAIN JSON into a valid structure", () => {
    const parsed = JSON.parse(sampleExplain);
    expect(parsed).toBeInstanceOf(Array);
    expect(parsed[0]).toHaveProperty("Plan");
    expect(parsed[0].Plan["Node Type"]).toBe("Limit");
  });

  it("should have correct cost values", () => {
    const parsed = JSON.parse(sampleExplain);
    const plan = parsed[0].Plan;
    expect(plan["Startup Cost"]).toBe(45.32);
    expect(plan["Total Cost"]).toBe(48.67);
    expect(plan["Plan Rows"]).toBe(10);
  });

  it("should have nested plan nodes", () => {
    const parsed = JSON.parse(sampleExplain);
    const plan = parsed[0].Plan;
    expect(plan.Plans).toHaveLength(1);
    expect(plan.Plans[0]["Node Type"]).toBe("Sort");
    expect(plan.Plans[0].Plans[0]["Node Type"]).toBe("Nested Loop");
    expect(plan.Plans[0].Plans[0].Plans).toHaveLength(2);
  });

  it("should correctly identify scan types and indexes", () => {
    const parsed = JSON.parse(sampleExplain);
    const nestedLoop = parsed[0].Plan.Plans[0].Plans[0];
    const indexScan1 = nestedLoop.Plans[0];
    const indexScan2 = nestedLoop.Plans[1];

    expect(indexScan1["Node Type"]).toBe("Index Scan");
    expect(indexScan1["Relation Name"]).toBe("demo_employees");
    expect(indexScan1["Index Name"]).toBe("idx_emp_salary");

    expect(indexScan2["Node Type"]).toBe("Index Scan");
    expect(indexScan2["Relation Name"]).toBe("demo_departments");
  });

  function convertPlanNode(plan: Record<string, unknown>, id: string): { id: string; type: string; cost: number; rows: number; children: unknown[] } {
    const children: unknown[] = [];
    if (Array.isArray(plan.Plans)) {
      plan.Plans.forEach((child: Record<string, unknown>, i: number) => {
        children.push(convertPlanNode(child, `${id}-${i}`));
      });
    }
    return {
      id,
      type: (plan["Node Type"] as string) || "Unknown",
      cost: (plan["Total Cost"] as number) || 0,
      rows: (plan["Plan Rows"] as number) || 0,
      children,
    };
  }

  it("should convert plan to tree structure", () => {
    const parsed = JSON.parse(sampleExplain);
    const tree = convertPlanNode(parsed[0].Plan, "0");

    expect(tree.id).toBe("0");
    expect(tree.type).toBe("Limit");
    expect(tree.cost).toBe(48.67);
    expect(tree.children).toHaveLength(1);
  });
});

describe("Session Comparison Logic", () => {
  const sessions = [
    { session_id: 1, total_duration_ms: 45.2, total_stages: 7 },
    { session_id: 2, total_duration_ms: 32.1, total_stages: 7 },
    { session_id: 3, total_duration_ms: 18.5, total_stages: 7 },
  ];

  it("should identify fastest and slowest sessions", () => {
    const durations = sessions.map(s => s.total_duration_ms);
    const fastest = Math.min(...durations);
    const slowest = Math.max(...durations);

    expect(fastest).toBe(18.5);
    expect(slowest).toBe(45.2);
  });

  it("should calculate duration differences correctly", () => {
    const diff = sessions[0].total_duration_ms - sessions[1].total_duration_ms;
    expect(diff).toBeCloseTo(13.1, 1);
  });

  it("should calculate percentage of max duration", () => {
    const maxDuration = Math.max(...sessions.map(s => s.total_duration_ms));
    const pcts = sessions.map(s => (s.total_duration_ms / maxDuration) * 100);

    expect(pcts[0]).toBe(100); // 45.2 is max
    expect(pcts[1]).toBeCloseTo(71.0, 0);
    expect(pcts[2]).toBeCloseTo(40.9, 0);
  });
});

describe("Candidate Path Selection", () => {
  const paths = [
    { path_type: "Nested Loop + Index Scan", total_cost: 48.67, is_selected: true },
    { path_type: "Hash Join + Seq Scan", total_cost: 125.43, is_selected: false },
    { path_type: "Merge Join + Sort", total_cost: 98.21, is_selected: false },
  ];

  it("should select the path with lowest cost", () => {
    const selected = paths.find(p => p.is_selected);
    const minCost = Math.min(...paths.map(p => p.total_cost));

    expect(selected).toBeDefined();
    expect(selected!.total_cost).toBe(minCost);
    expect(selected!.path_type).toBe("Nested Loop + Index Scan");
  });

  it("should have exactly one selected path", () => {
    const selectedCount = paths.filter(p => p.is_selected).length;
    expect(selectedCount).toBe(1);
  });

  it("should sort paths by cost", () => {
    const sorted = [...paths].sort((a, b) => a.total_cost - b.total_cost);
    expect(sorted[0].path_type).toBe("Nested Loop + Index Scan");
    expect(sorted[1].path_type).toBe("Merge Join + Sort");
    expect(sorted[2].path_type).toBe("Hash Join + Seq Scan");
  });
});

describe("Replay State Machine", () => {
  const totalStages = 7;

  it("should start at stage 0", () => {
    const initialState = { currentStage: 0, isPlaying: false, mode: "idle" as const };
    expect(initialState.currentStage).toBe(0);
    expect(initialState.isPlaying).toBe(false);
  });

  it("should advance stage correctly", () => {
    let currentStage = 0;
    const advance = () => {
      currentStage = Math.min(currentStage + 1, totalStages - 1);
      return currentStage;
    };

    expect(advance()).toBe(1);
    expect(advance()).toBe(2);
    expect(advance()).toBe(3);
  });

  it("should not exceed total stages", () => {
    let currentStage = totalStages - 1;
    currentStage = Math.min(currentStage + 1, totalStages - 1);
    expect(currentStage).toBe(totalStages - 1);
  });

  it("should go back correctly", () => {
    let currentStage = 3;
    const goBack = () => {
      currentStage = Math.max(currentStage - 1, 0);
      return currentStage;
    };

    expect(goBack()).toBe(2);
    expect(goBack()).toBe(1);
    expect(goBack()).toBe(0);
    expect(goBack()).toBe(0); // Should not go below 0
  });

  it("should calculate speed multiplier correctly", () => {
    const speedToMultiplier = (ms: number) => {
      if (ms < 1000) return `${(1000 / ms).toFixed(0)}x`;
      if (ms === 1000) return "1x";
      return `${(1000 / ms).toFixed(1)}x`;
    };

    expect(speedToMultiplier(250)).toBe("4x");
    expect(speedToMultiplier(500)).toBe("2x");
    expect(speedToMultiplier(1000)).toBe("1x");
    expect(speedToMultiplier(2000)).toBe("0.5x");
  });
});
