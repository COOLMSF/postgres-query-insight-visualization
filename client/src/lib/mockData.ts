/**
 * Mock data for PG Query Optimizer Visualizer
 * This simulates the data that would come from the PostgreSQL tracer extension
 * via the FastAPI backend. In production, this would be replaced by tRPC calls.
 */

export interface TraceSession {
  session_id: number;
  query_text: string;
  query_hash: number;
  start_time: string;
  end_time: string | null;
  total_duration_ms: number;
  total_stages: number;
  status: "running" | "completed" | "error";
  pid: number;
  database_name: string;
  username: string;
}

export interface TraceStage {
  stage_id: number;
  session_id: number;
  stage_seq: number;
  stage_name: string;
  stage_data: string | null;
  plan_tree: string | null;
  explain_output: string | null;
  node_type: string | null;
  estimated_cost: number | null;
  estimated_rows: number | null;
  actual_duration_ms: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface TracePath {
  path_id: number;
  session_id: number;
  stage_id: number;
  path_type: string;
  path_description: string;
  total_cost: number;
  startup_cost: number;
  rows_estimate: number;
  is_selected: boolean;
  parent_rel: string;
}

export interface PlanNode {
  id: string;
  type: string;
  label: string;
  cost: number;
  rows: number;
  width?: number;
  startupCost?: number;
  actualTime?: number;
  children: PlanNode[];
  details?: Record<string, string | number | boolean>;
}

// Stage display configuration
export const STAGE_CONFIG: Record<string, { label: string; color: string; icon: string; description: string }> = {
  parse: {
    label: "解析",
    color: "#60a5fa",
    icon: "FileCode",
    description: "SQL 文本被分词并解析为解析树，检查语法有效性。",
  },
  analyze: {
    label: "分析",
    color: "#a78bfa",
    icon: "Search",
    description: "解析树被转换为查询树，进行语义分析和类型检查。",
  },
  rewrite: {
    label: "重写",
    color: "#f472b6",
    icon: "RefreshCw",
    description: "通过应用规则、展开视图和优化子查询来重写查询树。",
  },
  plan: {
    label: "计划",
    color: "#34d399",
    icon: "Route",
    description: "查询优化器生成候选执行计划，并基于成本估算选择最优计划。",
  },
  explain: {
    label: "解释",
    color: "#fbbf24",
    icon: "FileText",
    description: "EXPLAIN 输出显示详细的执行计划和成本估算。",
  },
  execute_start: {
    label: "执行开始",
    color: "#fb923c",
    icon: "Play",
    description: "执行器初始化计划树并准备进行元组处理。",
  },
  execute_end: {
    label: "执行结束",
    color: "#f87171",
    icon: "CheckCircle",
    description: "执行完成，返回结果给客户端。",
  },
};

// Demo sessions
export const DEMO_SESSIONS: TraceSession[] = [
  {
    session_id: 1,
    query_text: "SELECT e.name, e.salary, d.name AS dept_name FROM demo_employees e JOIN demo_departments d ON e.department = d.name WHERE e.salary > 60000 ORDER BY e.salary DESC LIMIT 10",
    query_hash: 123456789,
    start_time: "2026-03-19T08:30:00Z",
    end_time: "2026-03-19T08:30:00.045Z",
    total_duration_ms: 45.2,
    total_stages: 7,
    status: "completed",
    pid: 12345,
    database_name: "query_tracer_db",
    username: "postgres",
  },
  {
    session_id: 2,
    query_text: "SELECT department, COUNT(*) as cnt, AVG(salary) as avg_salary, MAX(salary) as max_salary FROM demo_employees GROUP BY department HAVING COUNT(*) > 100 ORDER BY avg_salary DESC",
    query_hash: 987654321,
    start_time: "2026-03-19T08:31:00Z",
    end_time: "2026-03-19T08:31:00.032Z",
    total_duration_ms: 32.1,
    total_stages: 7,
    status: "completed",
    pid: 12345,
    database_name: "query_tracer_db",
    username: "postgres",
  },
  {
    session_id: 3,
    query_text: "SELECT * FROM demo_employees WHERE department = 'Engineering' AND salary BETWEEN 50000 AND 80000",
    query_hash: 456789123,
    start_time: "2026-03-19T08:32:00Z",
    end_time: "2026-03-19T08:32:00.018Z",
    total_duration_ms: 18.5,
    total_stages: 7,
    status: "completed",
    pid: 12345,
    database_name: "query_tracer_db",
    username: "postgres",
  },
  {
    session_id: 4,
    query_text: "SELECT d.name, COUNT(e.id) as emp_count, SUM(e.salary) as total_salary FROM demo_departments d LEFT JOIN demo_employees e ON d.name = e.department GROUP BY d.name",
    query_hash: 321654987,
    start_time: "2026-03-19T08:33:00Z",
    end_time: "2026-03-19T08:33:00.055Z",
    total_duration_ms: 55.8,
    total_stages: 7,
    status: "completed",
    pid: 12345,
    database_name: "query_tracer_db",
    username: "postgres",
  },
];

// Demo stages for session 1
export const DEMO_STAGES: Record<number, TraceStage[]> = {
  1: [
    {
      stage_id: 1, session_id: 1, stage_seq: 1, stage_name: "parse",
      stage_data: JSON.stringify({
        command_type: "SELECT", has_aggs: false, has_window_funcs: false,
        has_sublinks: false, has_distinct_on: false, has_recursive: false,
        has_for_update: false, num_rtable_entries: 2, num_jointree_items: 1, num_target_list: 3,
      }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.8,
      created_at: "2026-03-19T08:30:00.001Z", metadata: {},
    },
    {
      stage_id: 2, session_id: 1, stage_seq: 2, stage_name: "analyze",
      stage_data: JSON.stringify({
        query_type: "SELECT", target_columns: ["e.name", "e.salary", "d.name"],
        from_tables: ["demo_employees e", "demo_departments d"],
        join_conditions: ["e.department = d.name"],
        where_conditions: ["e.salary > 60000"],
        order_by: ["e.salary DESC"], limit: 10,
      }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 1.2,
      created_at: "2026-03-19T08:30:00.002Z", metadata: {},
    },
    {
      stage_id: 3, session_id: 1, stage_seq: 3, stage_name: "rewrite",
      stage_data: JSON.stringify({
        stage: "rewrite", description: "Query tree after rule application and view expansion",
        rtable_count: 2, query_type: "SELECT",
        rules_applied: ["none - base tables only"],
        views_expanded: [],
      }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.3,
      created_at: "2026-03-19T08:30:00.003Z", metadata: {},
    },
    {
      stage_id: 4, session_id: 1, stage_seq: 4, stage_name: "plan",
      stage_data: JSON.stringify({
        plan_type: "Limit", startup_cost: 45.32, total_cost: 48.67,
        plan_rows: 10, plan_width: 68, parallel_aware: false, parallel_safe: true,
        num_params: 0, num_subplans: 0,
        candidate_plans: [
          { type: "Nested Loop + Index Scan", cost: 48.67, selected: true },
          { type: "Hash Join + Seq Scan", cost: 125.43, selected: false },
          { type: "Merge Join + Sort", cost: 98.21, selected: false },
        ],
      }),
      plan_tree: null, explain_output: null, node_type: "Limit",
      estimated_cost: 48.67, estimated_rows: 10, actual_duration_ms: 12.5,
      created_at: "2026-03-19T08:30:00.015Z", metadata: {},
    },
    {
      stage_id: 5, session_id: 1, stage_seq: 5, stage_name: "explain",
      stage_data: null,
      plan_tree: null,
      explain_output: JSON.stringify([{
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
                  "Index Cond": "(salary > 60000)",
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
                  "Index Cond": "(name = e.department)",
                  "Startup Cost": 0.15,
                  "Total Cost": 0.17,
                  "Plan Rows": 1,
                  "Plan Width": 24,
                }
              ]
            }]
          }]
        }
      }]),
      node_type: "Limit",
      estimated_cost: 48.67, estimated_rows: 10, actual_duration_ms: 0.5,
      created_at: "2026-03-19T08:30:00.016Z", metadata: {},
    },
    {
      stage_id: 6, session_id: 1, stage_seq: 6, stage_name: "execute_start",
      stage_data: JSON.stringify({
        stage: "executor_start", operation: "SELECT",
        eflags: 0, instrument_options: 0, already_executed: false,
      }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.2,
      created_at: "2026-03-19T08:30:00.017Z", metadata: {},
    },
    {
      stage_id: 7, session_id: 1, stage_seq: 7, stage_name: "execute_end",
      stage_data: JSON.stringify({
        stage: "executor_end", rows_processed: 10, operation: "SELECT",
      }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 29.7,
      created_at: "2026-03-19T08:30:00.045Z", metadata: {},
    },
  ],
  2: [
    {
      stage_id: 8, session_id: 2, stage_seq: 1, stage_name: "parse",
      stage_data: JSON.stringify({
        command_type: "SELECT", has_aggs: true, has_window_funcs: false,
        has_sublinks: false, has_distinct_on: false, has_recursive: false,
        has_for_update: false, num_rtable_entries: 1, num_jointree_items: 1, num_target_list: 4,
      }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.5,
      created_at: "2026-03-19T08:31:00.001Z", metadata: {},
    },
    {
      stage_id: 9, session_id: 2, stage_seq: 2, stage_name: "analyze",
      stage_data: JSON.stringify({
        query_type: "SELECT", target_columns: ["department", "COUNT(*)", "AVG(salary)", "MAX(salary)"],
        from_tables: ["demo_employees"],
        group_by: ["department"], having: ["COUNT(*) > 100"],
        order_by: ["avg_salary DESC"],
      }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.8,
      created_at: "2026-03-19T08:31:00.002Z", metadata: {},
    },
    {
      stage_id: 10, session_id: 2, stage_seq: 3, stage_name: "rewrite",
      stage_data: JSON.stringify({
        stage: "rewrite", description: "No rewrite rules applied",
        rtable_count: 1, query_type: "SELECT",
      }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.2,
      created_at: "2026-03-19T08:31:00.003Z", metadata: {},
    },
    {
      stage_id: 11, session_id: 2, stage_seq: 4, stage_name: "plan",
      stage_data: JSON.stringify({
        plan_type: "Sort", startup_cost: 22.15, total_cost: 22.18,
        plan_rows: 4, plan_width: 72, parallel_aware: false, parallel_safe: true,
        candidate_plans: [
          { type: "HashAggregate + Seq Scan", cost: 22.18, selected: true },
          { type: "GroupAggregate + Sort + Seq Scan", cost: 35.42, selected: false },
        ],
      }),
      plan_tree: null, explain_output: null, node_type: "Sort",
      estimated_cost: 22.18, estimated_rows: 4, actual_duration_ms: 8.3,
      created_at: "2026-03-19T08:31:00.010Z", metadata: {},
    },
    {
      stage_id: 12, session_id: 2, stage_seq: 5, stage_name: "explain",
      stage_data: null,
      plan_tree: null,
      explain_output: JSON.stringify([{
        "Plan": {
          "Node Type": "Sort",
          "Sort Key": ["(avg(salary)) DESC"],
          "Startup Cost": 22.15,
          "Total Cost": 22.18,
          "Plan Rows": 4,
          "Plan Width": 72,
          "Plans": [{
            "Node Type": "HashAggregate",
            "Group Key": ["department"],
            "Filter": "(count(*) > 100)",
            "Startup Cost": 22.00,
            "Total Cost": 22.10,
            "Plan Rows": 4,
            "Plan Width": 72,
            "Plans": [{
              "Node Type": "Seq Scan",
              "Relation Name": "demo_employees",
              "Startup Cost": 0.00,
              "Total Cost": 17.00,
              "Plan Rows": 1000,
              "Plan Width": 18,
            }]
          }]
        }
      }]),
      node_type: "Sort",
      estimated_cost: 22.18, estimated_rows: 4, actual_duration_ms: 0.3,
      created_at: "2026-03-19T08:31:00.011Z", metadata: {},
    },
    {
      stage_id: 13, session_id: 2, stage_seq: 6, stage_name: "execute_start",
      stage_data: JSON.stringify({ stage: "executor_start", operation: "SELECT", eflags: 0 }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.1,
      created_at: "2026-03-19T08:31:00.012Z", metadata: {},
    },
    {
      stage_id: 14, session_id: 2, stage_seq: 7, stage_name: "execute_end",
      stage_data: JSON.stringify({ stage: "executor_end", rows_processed: 4, operation: "SELECT" }),
      plan_tree: null, explain_output: null, node_type: null,
      estimated_cost: null, estimated_rows: null, actual_duration_ms: 21.9,
      created_at: "2026-03-19T08:31:00.032Z", metadata: {},
    },
  ],
};

// Generate stages for sessions 3 and 4 similarly
DEMO_STAGES[3] = [
  {
    stage_id: 15, session_id: 3, stage_seq: 1, stage_name: "parse",
    stage_data: JSON.stringify({
      command_type: "SELECT", has_aggs: false, num_rtable_entries: 1, num_target_list: 5,
    }),
    plan_tree: null, explain_output: null, node_type: null,
    estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.4,
    created_at: "2026-03-19T08:32:00.001Z", metadata: {},
  },
  {
    stage_id: 16, session_id: 3, stage_seq: 2, stage_name: "analyze",
    stage_data: JSON.stringify({
      query_type: "SELECT", target_columns: ["*"],
      from_tables: ["demo_employees"],
      where_conditions: ["department = 'Engineering'", "salary BETWEEN 50000 AND 80000"],
    }),
    plan_tree: null, explain_output: null, node_type: null,
    estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.6,
    created_at: "2026-03-19T08:32:00.002Z", metadata: {},
  },
  {
    stage_id: 17, session_id: 3, stage_seq: 3, stage_name: "rewrite",
    stage_data: JSON.stringify({ stage: "rewrite", rtable_count: 1, query_type: "SELECT" }),
    plan_tree: null, explain_output: null, node_type: null,
    estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.1,
    created_at: "2026-03-19T08:32:00.003Z", metadata: {},
  },
  {
    stage_id: 18, session_id: 3, stage_seq: 4, stage_name: "plan",
    stage_data: JSON.stringify({
      plan_type: "Bitmap Heap Scan", startup_cost: 5.12, total_cost: 15.89,
      plan_rows: 62, plan_width: 44,
      candidate_plans: [
        { type: "Bitmap Heap Scan (idx_emp_dept + idx_emp_salary)", cost: 15.89, selected: true },
        { type: "Seq Scan with Filter", cost: 22.00, selected: false },
        { type: "Index Scan (idx_emp_dept)", cost: 18.45, selected: false },
      ],
    }),
    plan_tree: null, explain_output: null, node_type: "Bitmap Heap Scan",
    estimated_cost: 15.89, estimated_rows: 62, actual_duration_ms: 5.2,
    created_at: "2026-03-19T08:32:00.008Z", metadata: {},
  },
  {
    stage_id: 19, session_id: 3, stage_seq: 5, stage_name: "explain",
    stage_data: null, plan_tree: null,
    explain_output: JSON.stringify([{
      "Plan": {
        "Node Type": "Bitmap Heap Scan",
        "Relation Name": "demo_employees",
        "Recheck Cond": "(department = 'Engineering')",
        "Filter": "(salary >= 50000 AND salary <= 80000)",
        "Startup Cost": 5.12, "Total Cost": 15.89, "Plan Rows": 62, "Plan Width": 44,
        "Plans": [{
          "Node Type": "BitmapAnd",
          "Startup Cost": 5.10, "Total Cost": 5.10, "Plan Rows": 62,
          "Plans": [
            { "Node Type": "Bitmap Index Scan", "Index Name": "idx_emp_dept", "Index Cond": "(department = 'Engineering')", "Startup Cost": 0.00, "Total Cost": 2.50, "Plan Rows": 250 },
            { "Node Type": "Bitmap Index Scan", "Index Name": "idx_emp_salary", "Index Cond": "(salary >= 50000 AND salary <= 80000)", "Startup Cost": 0.00, "Total Cost": 2.55, "Plan Rows": 500 }
          ]
        }]
      }
    }]),
    node_type: "Bitmap Heap Scan",
    estimated_cost: 15.89, estimated_rows: 62, actual_duration_ms: 0.2,
    created_at: "2026-03-19T08:32:00.009Z", metadata: {},
  },
  {
    stage_id: 20, session_id: 3, stage_seq: 6, stage_name: "execute_start",
    stage_data: JSON.stringify({ stage: "executor_start", operation: "SELECT" }),
    plan_tree: null, explain_output: null, node_type: null,
    estimated_cost: null, estimated_rows: null, actual_duration_ms: 0.1,
    created_at: "2026-03-19T08:32:00.010Z", metadata: {},
  },
  {
    stage_id: 21, session_id: 3, stage_seq: 7, stage_name: "execute_end",
    stage_data: JSON.stringify({ stage: "executor_end", rows_processed: 58, operation: "SELECT" }),
    plan_tree: null, explain_output: null, node_type: null,
    estimated_cost: null, estimated_rows: null, actual_duration_ms: 11.9,
    created_at: "2026-03-19T08:32:00.018Z", metadata: {},
  },
];

DEMO_STAGES[4] = DEMO_STAGES[2].map((s, i) => ({
  ...s,
  stage_id: 22 + i,
  session_id: 4,
}));

// Demo paths
export const DEMO_PATHS: Record<number, TracePath[]> = {
  1: [
    { path_id: 1, session_id: 1, stage_id: 4, path_type: "Nested Loop + Index Scan", path_description: "Inner join using nested loop with index scan on both tables", total_cost: 48.67, startup_cost: 0.43, rows_estimate: 250, is_selected: true, parent_rel: "demo_employees JOIN demo_departments" },
    { path_id: 2, session_id: 1, stage_id: 4, path_type: "Hash Join + Seq Scan", path_description: "Hash join with sequential scan on employees", total_cost: 125.43, startup_cost: 17.00, rows_estimate: 250, is_selected: false, parent_rel: "demo_employees JOIN demo_departments" },
    { path_id: 3, session_id: 1, stage_id: 4, path_type: "Merge Join + Sort", path_description: "Merge join requiring sort on both inputs", total_cost: 98.21, startup_cost: 35.50, rows_estimate: 250, is_selected: false, parent_rel: "demo_employees JOIN demo_departments" },
  ],
  2: [
    { path_id: 4, session_id: 2, stage_id: 11, path_type: "HashAggregate", path_description: "Hash-based aggregation on department", total_cost: 22.18, startup_cost: 22.00, rows_estimate: 4, is_selected: true, parent_rel: "demo_employees" },
    { path_id: 5, session_id: 2, stage_id: 11, path_type: "GroupAggregate + Sort", path_description: "Sort-based group aggregate", total_cost: 35.42, startup_cost: 30.00, rows_estimate: 4, is_selected: false, parent_rel: "demo_employees" },
  ],
};

// Helper to parse EXPLAIN JSON into tree nodes
export function parseExplainToTree(explainJson: string): PlanNode | null {
  try {
    const parsed = JSON.parse(explainJson);
    const plan = Array.isArray(parsed) ? parsed[0]?.Plan : parsed?.Plan;
    if (!plan) return null;
    return convertPlanNode(plan, "0");
  } catch {
    return null;
  }
}

function convertPlanNode(plan: Record<string, unknown>, id: string): PlanNode {
  const children: PlanNode[] = [];
  if (Array.isArray(plan.Plans)) {
    plan.Plans.forEach((child: Record<string, unknown>, i: number) => {
      children.push(convertPlanNode(child, `${id}-${i}`));
    });
  }

  const details: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(plan)) {
    if (key !== "Plans" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) {
      details[key] = value;
    }
  }

  return {
    id,
    type: (plan["Node Type"] as string) || "Unknown",
    label: buildNodeLabel(plan),
    cost: (plan["Total Cost"] as number) || 0,
    rows: (plan["Plan Rows"] as number) || 0,
    width: plan["Plan Width"] as number,
    startupCost: plan["Startup Cost"] as number,
    children,
    details,
  };
}

function buildNodeLabel(plan: Record<string, unknown>): string {
  const parts: string[] = [plan["Node Type"] as string || "Unknown"];
  if (plan["Relation Name"]) parts.push(`on ${plan["Relation Name"]}`);
  if (plan["Alias"] && plan["Alias"] !== plan["Relation Name"]) parts.push(`(${plan["Alias"]})`);
  if (plan["Index Name"]) parts.push(`using ${plan["Index Name"]}`);
  return parts.join(" ");
}

// Get session with all data
export function getMockSessionDetail(sessionId: number) {
  const session = DEMO_SESSIONS.find(s => s.session_id === sessionId);
  if (!session) return null;
  return {
    session,
    stages: DEMO_STAGES[sessionId] || [],
    paths: DEMO_PATHS[sessionId] || [],
    statistics: [],
  };
}
