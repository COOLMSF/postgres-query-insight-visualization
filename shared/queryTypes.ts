import { z } from "zod";

// Schema for query analysis
export const analyzeQuerySchema = z.object({
  sql: z.string().min(1, "SQL query is required"),
  databaseName: z.string().optional().default("postgres"),
});

export type AnalyzeQueryInput = z.infer<typeof analyzeQuerySchema>;

// Schema for session query
export const getSessionSchema = z.object({
  sessionId: z.number(),
});

export type GetSessionInput = z.infer<typeof getSessionSchema>;

// Schema for delete session
export const deleteSessionSchema = z.object({
  sessionId: z.number(),
});

export type DeleteSessionInput = z.infer<typeof deleteSessionSchema>;

// Schema for get sessions list
export const getSessionsSchema = z.object({
  limit: z.number().optional().default(100),
  status: z.string().optional(),
  databaseName: z.string().optional(),
});

export type GetSessionsInput = z.infer<typeof getSessionsSchema>;

// Response types
export interface QuerySession {
  id: number;
  sessionId: string;
  queryText: string;
  databaseName: string;
  userName: string;
  startTime: Date;
  endTime: Date | null;
  totalDurationMs: number | null;
  totalStages: number;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
}

export interface OptimizationStage {
  id: number;
  sessionId: number;
  stageSeq: number;
  stageName: string;
  startTime: Date;
  endTime: Date | null;
  durationMs: number | null;
  stageData: any;
  createdAt: Date;
}

export interface ExecutionPath {
  id: number;
  sessionId: number;
  stageId: number;
  pathType: string;
  pathDescription: string;
  totalCost: number;
  startupCost: number;
  rowsEstimate: number;
  isSelected: boolean;
  parentRel: string | null;
  pathData: any;
  createdAt: Date;
}

export interface QueryAnalysisResult {
  session: QuerySession;
  stages: OptimizationStage[];
  paths: ExecutionPath[];
}

export interface AnalyzeResponse {
  success: boolean;
  data: QueryAnalysisResult;
}

export interface GetSessionsResponse {
  success: boolean;
  data: QuerySession[];
}

export interface GetSessionDetailResponse {
  success: boolean;
  data: QueryAnalysisResult | null;
}

export interface DeleteSessionResponse {
  success: boolean;
  message: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}
