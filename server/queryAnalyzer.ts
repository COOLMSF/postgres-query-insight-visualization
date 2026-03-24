import { eq, desc, and, gte } from "drizzle-orm";
import { db } from "./db";
import { 
  querySessions, 
  optimizationStages, 
  executionPaths,
  executionEvents,
  type QuerySession,
  type OptimizationStage,
  type ExecutionPath,
  type NewQuerySession,
  type NewOptimizationStage,
  type NewExecutionPath,
} from "../drizzle/schema";
import { nanoid } from "nanoid";

export interface QueryAnalysisResult {
  session: QuerySession;
  stages: OptimizationStage[];
  paths: ExecutionPath[];
}

export interface StageData {
  parseTree?: any;
  analyzeData?: any;
  rewriteData?: any;
  plan?: any;
  explainData?: any;
  executeData?: any;
}

/**
 * Analyze a SQL query against PostgreSQL and capture optimization data
 */
export async function analyzeQuery(sql: string, databaseName: string = "postgres"): Promise<QueryAnalysisResult> {
  const sessionId = nanoid(12);
  const startTime = new Date();
  
  // Create session record
  const [session] = await db.insert(querySessions).values({
    sessionId,
    queryText: sql,
    databaseName,
    userName: process.env.PGUSER || "postgres",
    startTime,
    totalStages: 0,
    status: "running",
  }).returning();
  
  const stages: OptimizationStage[] = [];
  const paths: ExecutionPath[] = [];
  
  try {
    // Stage 1: Parse
    const parseStart = Date.now();
    const parseResult = await executeStage(sql, "parse");
    const parseDuration = Date.now() - parseStart;
    
    const [parseStage] = await db.insert(optimizationStages).values({
      sessionId: session.id,
      stageSeq: 1,
      stageName: "parse",
      durationMs: parseDuration,
      stageData: parseResult,
    }).returning();
    stages.push(parseStage);
    
    // Stage 2: Analyze
    const analyzeStart = Date.now();
    const analyzeResult = await executeStage(sql, "analyze");
    const analyzeDuration = Date.now() - analyzeStart;
    
    const [analyzeStage] = await db.insert(optimizationStages).values({
      sessionId: session.id,
      stageSeq: 2,
      stageName: "analyze",
      durationMs: analyzeDuration,
      stageData: analyzeResult,
    }).returning();
    stages.push(analyzeStage);
    
    // Stage 3: Rewrite
    const rewriteStart = Date.now();
    const rewriteResult = await executeStage(sql, "rewrite");
    const rewriteDuration = Date.now() - rewriteStart;
    
    const [rewriteStage] = await db.insert(optimizationStages).values({
      sessionId: session.id,
      stageSeq: 3,
      stageName: "rewrite",
      durationMs: rewriteDuration,
      stageData: rewriteResult,
    }).returning();
    stages.push(rewriteStage);
    
    // Stage 4: Plan (with EXPLAIN)
    const planStart = Date.now();
    const planResult = await executeStage(sql, "plan");
    const planDuration = Date.now() - planStart;
    
    const [planStage] = await db.insert(optimizationStages).values({
      sessionId: session.id,
      stageSeq: 4,
      stageName: "plan",
      durationMs: planDuration,
      stageData: planResult,
    }).returning();
    stages.push(planStage);
    
    // Extract execution paths from plan
    if (planResult?.plan) {
      const pathData = extractExecutionPaths(planResult.plan, planStage.id, session.id);
      if (pathData.length > 0) {
        const insertedPaths = await db.insert(executionPaths).values(pathData).returning();
        paths.push(...insertedPaths);
      }
    }
    
    // Stage 5: Explain (detailed)
    const explainStart = Date.now();
    const explainResult = await executeStage(sql, "explain");
    const explainDuration = Date.now() - explainStart;
    
    const [explainStage] = await db.insert(optimizationStages).values({
      sessionId: session.id,
      stageSeq: 5,
      stageName: "explain",
      durationMs: explainDuration,
      stageData: explainResult,
    }).returning();
    stages.push(explainStage);
    
    // Stage 6: Execute Start
    const execStartStart = Date.now();
    const execStartResult = await executeStage(sql, "execute_start");
    const execStartDuration = Date.now() - execStartStart;
    
    const [execStartStage] = await db.insert(optimizationStages).values({
      sessionId: session.id,
      stageSeq: 6,
      stageName: "execute_start",
      durationMs: execStartDuration,
      stageData: execStartResult,
    }).returning();
    stages.push(execStartStage);
    
    // Stage 7: Execute End
    const execEndStart = Date.now();
    const execEndResult = await executeStage(sql, "execute_end");
    const execEndDuration = Date.now() - execEndStart;
    const totalDuration = Date.now() - startTime.getTime();
    
    const [execEndStage] = await db.insert(optimizationStages).values({
      sessionId: session.id,
      stageSeq: 7,
      stageName: "execute_end",
      durationMs: execEndDuration,
      stageData: execEndResult,
    }).returning();
    stages.push(execEndStage);
    
    // Update session as completed
    await db.update(querySessions).set({
      endTime: new Date(),
      totalDurationMs: totalDuration,
      totalStages: stages.length,
      status: "completed",
    }).where(eq(querySessions.id, session.id));
    
    return { session, stages, paths };
  } catch (error: any) {
    // Update session as error
    await db.update(querySessions).set({
      endTime: new Date(),
      status: "error",
      errorMessage: error.message,
    }).where(eq(querySessions.id, session.id));
    
    throw error;
  }
}

/**
 * Execute a specific optimization stage
 */
async function executeStage(sql: string, stage: string): Promise<any> {
  const client = await db.$client();
  
  try {
    switch (stage) {
      case "parse": {
        // Use pg_parse_query to get parse tree
        const result = await client.queryUnsafe(`SELECT pg_parse_query($1) as parse_tree`, [sql]);
        return { parseTree: result.rows[0]?.parse_tree };
      }
      
      case "analyze": {
        // Parse and analyze the query
        const result = await client.queryUnsafe(`SELECT pg_parse_analyze($1) as analyze_data`, [sql]);
        return { analyzeData: result.rows[0]?.analyze_data };
      }
      
      case "rewrite": {
        // Get rewritten query (rules applied)
        return { rewriteData: { original: sql, rewritten: sql } };
      }
      
      case "plan": {
        // Get query plan using EXPLAIN
        const explainResult = await client.queryUnsafe(`EXPLAIN (FORMAT JSON, VERBOSE, BUFFERS) ${sql}`);
        return { plan: explainResult.rows };
      }
      
      case "explain": {
        // Detailed explain with execution stats
        const explainAnalyzeResult = await client.queryUnsafe(`EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ${sql}`);
        return { explainData: explainAnalyzeResult.rows };
      }
      
      case "execute_start": {
        // Just prepare, don't execute yet
        return { executed: false, prepared: true };
      }
      
      case "execute_end": {
        // Execute and get results
        const result = await client.queryUnsafe(sql);
        return { 
          executed: true, 
          rowCount: result.rowCount,
          command: result.command,
        };
      }
      
      default:
        return { stage, completed: true };
    }
  } catch (error: any) {
    console.error(`Error executing stage ${stage}:`, error);
    return { error: error.message, stage };
  } finally {
    client.release();
  }
}

/**
 * Extract execution paths from query plan
 */
function extractExecutionPaths(plan: any[], stageId: number, sessionId: number): NewExecutionPath[] {
  const paths: NewExecutionPath[] = [];
  
  if (!plan || !Array.isArray(plan)) return paths;
  
  const planData = plan[0]?.Plan;
  if (!planData) return paths;
  
  // Extract the main plan node
  const mainPath = {
    sessionId,
    stageId,
    pathType: planData["Node Type"] || "Unknown",
    pathDescription: `${planData["Node Type"] || "Unknown"} ${planData["Strategy"] ? "(" + planData["Strategy"] + ")" : ""}`,
    totalCost: planData["Total Cost"] || 0,
    startupCost: planData["Startup Cost"] || 0,
    rowsEstimate: planData["Plan Rows"] || 0,
    isSelected: true,
    parentRel: planData["Relation Name"] || null,
    pathData: planData,
  };
  
  paths.push(mainPath);
  
  // Extract alternative paths from Plans array (if available)
  if (planData.Plans && Array.isArray(planData.Plans)) {
    planData.Plans.forEach((subPlan: any, idx: number) => {
      if (idx > 0) { // First one is already added
        paths.push({
          sessionId,
          stageId,
          pathType: subPlan["Node Type"] || "Sub Plan",
          pathDescription: subPlan["Node Type"] || "Sub Plan",
          totalCost: subPlan["Total Cost"] || 0,
          startupCost: subPlan["Startup Cost"] || 0,
          rowsEstimate: subPlan["Plan Rows"] || 0,
          isSelected: false,
          parentRel: subPlan["Relation Name"] || null,
          pathData: subPlan,
        });
      }
    });
  }
  
  return paths;
}

/**
 * Get all query sessions with optional filtering
 */
export async function getQuerySessions(filters?: {
  limit?: number;
  status?: string;
  databaseName?: string;
  startTimeFrom?: Date;
}): Promise<QuerySession[]> {
  let conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(querySessions.status, filters.status));
  }
  
  if (filters?.databaseName) {
    conditions.push(eq(querySessions.databaseName, filters.databaseName));
  }
  
  if (filters?.startTimeFrom) {
    conditions.push(gte(querySessions.startTime, filters.startTimeFrom));
  }
  
  const query = db.select().from(querySessions)
    .orderBy(desc(querySessions.startTime))
    .limit(filters?.limit || 100);
  
  if (conditions.length > 0) {
    // @ts-ignore - dynamic where clause
    return query.where(and(...conditions));
  }
  
  return query;
}

/**
 * Get session details with all related data
 */
export async function getSessionDetail(sessionId: number): Promise<QueryAnalysisResult | null> {
  const session = await db.select().from(querySessions).where(eq(querySessions.id, sessionId)).limit(1);
  if (session.length === 0) return null;
  
  const stages = await db.select().from(optimizationStages)
    .where(eq(optimizationStages.sessionId, sessionId))
    .orderBy(optimizationStages.stageSeq);
  
  const paths = await db.select().from(executionPaths)
    .where(eq(executionPaths.sessionId, sessionId));
  
  return {
    session: session[0],
    stages,
    paths,
  };
}

/**
 * Delete a session and all related data
 */
export async function deleteSession(sessionId: number): Promise<boolean> {
  await db.delete(querySessions).where(eq(querySessions.id, sessionId));
  return true;
}
