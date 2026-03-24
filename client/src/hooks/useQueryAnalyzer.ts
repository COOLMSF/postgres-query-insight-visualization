import { trpc } from "@/lib/trpc";
import type { AnalyzeQueryInput, GetSessionsInput } from "../../../shared/queryTypes";

export const useQueryAnalyzer = () => {
  const utils = trpc.useUtils();

  // Mutation for analyzing a query
  const analyzeMutation = trpc.query.analyze.useMutation({
    onSuccess: () => {
      // Invalidate sessions list after successful analysis
      utils.query.getSessions.invalidate();
    },
  });

  // Query for getting all sessions
  const sessionsQuery = trpc.query.getSessions.useQuery({
    limit: 100,
  });

  // Query for getting session detail
  const getSessionDetailQuery = (sessionId: number) => {
    return trpc.query.getSessionDetail.useQuery({ sessionId });
  };

  // Mutation for deleting a session
  const deleteSessionMutation = trpc.query.deleteSession.useMutation({
    onSuccess: () => {
      // Invalidate sessions list after deletion
      utils.query.getSessions.invalidate();
    },
  });

  // Query for testing database connection
  const testConnectionQuery = trpc.query.testConnection.useQuery();

  return {
    analyze: analyzeMutation,
    sessions: sessionsQuery,
    getSessionDetail: getSessionDetailQuery,
    deleteSession: deleteSessionMutation,
    testConnection: testConnectionQuery,
  };
};
