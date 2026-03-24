import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import * as analyzer from "../queryAnalyzer";
import { TRPCError } from "@trpc/server";

export const queryRouter = router({
  /**
   * Analyze a SQL query in real-time against PostgreSQL
   */
  analyze: publicProcedure
    .input(
      z.object({
        sql: z.string().min(1, "SQL query is required"),
        databaseName: z.string().optional().default("postgres"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await analyzer.analyzeQuery(input.sql, input.databaseName);
        return {
          success: true,
          data: {
            session: result.session,
            stages: result.stages,
            paths: result.paths,
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to analyze query",
        });
      }
    }),

  /**
   * Get all query sessions
   */
  getSessions: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(100),
        status: z.string().optional(),
        databaseName: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const sessions = await analyzer.getQuerySessions({
          limit: input.limit,
          status: input.status,
          databaseName: input.databaseName,
        });
        return {
          success: true,
          data: sessions,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch sessions",
        });
      }
    }),

  /**
   * Get session detail by ID
   */
  getSessionDetail: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await analyzer.getSessionDetail(input.sessionId);
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }
        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch session detail",
        });
      }
    }),

  /**
   * Delete a session
   */
  deleteSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await analyzer.deleteSession(input.sessionId);
        return {
          success: true,
          message: "Session deleted successfully",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete session",
        });
      }
    }),

  /**
   * Test database connection
   */
  testConnection: publicProcedure.query(async () => {
    try {
      const { testConnection } = await import("./db");
      const connected = await testConnection();
      return {
        success: connected,
        message: connected ? "Database connection successful" : "Database connection failed",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Database connection failed",
      };
    }
  }),
});
