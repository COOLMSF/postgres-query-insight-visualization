/*
 * pg_query_optimizer_tracer.c
 * 
 * PostgreSQL Query Optimizer Tracer Extension
 * 
 * This extension hooks into the PostgreSQL query optimization pipeline
 * to capture and trace each stage of query optimization:
 * - Parse: SQL text to parse tree
 * - Analyze: Parse tree to query tree with semantic analysis
 * - Rewrite: Query tree rewriting with rules and view expansion
 * - Plan: Query plan generation and optimization
 * - Execute: Query execution tracking
 * 
 * Author: PG Query Visualizer Team
 * License: PostgreSQL License
 */

#include "postgres.h"
#include "access/xact.h"
#include "catalog/pg_type.h"
#include "commands/extension.h"
#include "executor/executor.h"
#include "fmgr.h"
#include "libpq/pqformat.h"
#include "nodes/pg_list.h"
#include "nodes/parsenodes.h"
#include "optimizer/optimizer.h"
#include "optimizer/planner.h"
#include "parser/analyze.h"
#include "parser/parser.h"
#include "tcop/utility.h"
#include "utils/builtins.h"
#include "utils/jsonb.h"
#include "utils/snapmgr.h"
#include "utils/timestamp.h"
#include "utils/memutils.h"
#include "storage/lmgr.h"
#include "miscadmin.h"

PG_MODULE_MAGIC;

/* Global variables */
static bool tracer_enabled = true;
static char *tracer_connection_string = NULL;

/* Original function pointers for hooks */
static post_parse_analyze_hook_type prev_post_parse_analyze_hook = NULL;
static planner_hook_type prev_planner_hook = NULL;
static ExecutorStart_hook_type prev_ExecutorStart = NULL;
static ExecutorEnd_hook_type prev_ExecutorEnd = NULL;

/* Function declarations */
PG_FUNCTION_INFO_V1(pg_trace_query_start);
PG_FUNCTION_INFO_V1(pg_trace_query_end);
PG_FUNCTION_INFO_V1(pg_trace_get_stage_data);
PG_FUNCTION_INFO_V1(pg_tracer_enable);
PG_FUNCTION_INFO_V1(pg_tracer_disable);
PG_FUNCTION_INFO_V1(pg_tracer_is_enabled);

/* Hook function declarations */
static void tracer_post_parse_analyze_hook(ParseState *pstate, Query *query,
                                           JumbleState *jstate);
static PlannedStmt *tracer_planner_hook(Query *parse, const char *query_string,
                                        int cursorOptions, ParamListInfo boundParams);
static void tracer_ExecutorStart(QueryDesc *queryDesc, int eflags);
static void tracer_ExecutorEnd(QueryDesc *queryDesc);

/* Helper functions */
static void tracer_init_connection(void);
static void tracer_store_stage_data(const char *stage_name, const char *stage_data);
static char *query_tree_to_json(Query *query);
static char *plan_tree_to_json(PlannedStmt *plan);
static TimestampTz tracer_get_current_timestamp(void);
static void tracer_cleanup(void);

/* Extension initialization */
void _PG_init(void)
{
    /* Define custom GUC variables */
    DefineCustomBoolVariable("pg_query_optimizer_tracer.enabled",
                             "Enable query optimization tracing",
                             NULL,
                             &tracer_enabled,
                             true,
                             PGC_SUSET,
                             GUC_NOT_IN_SAMPLE,
                             NULL, NULL, NULL);

    DefineCustomStringVariable("pg_query_optimizer_tracer.connection_string",
                               "Connection string for storing trace data",
                               NULL,
                               &tracer_connection_string,
                               "",
                               PGC_SUSET,
                               GUC_NOT_IN_SAMPLE,
                               NULL, NULL, NULL);

    /* Install hooks */
    prev_post_parse_analyze_hook = post_parse_analyze_hook;
    post_parse_analyze_hook = tracer_post_parse_analyze_hook;

    prev_planner_hook = planner_hook;
    planner_hook = tracer_planner_hook;

    prev_ExecutorStart = ExecutorStart_hook;
    ExecutorStart_hook = tracer_ExecutorStart;

    prev_ExecutorEnd = ExecutorEnd_hook;
    ExecutorEnd_hook = tracer_ExecutorEnd;

    elog(LOG, "pg_query_optimizer_tracer: extension initialized");
}

/* Extension cleanup */
void _PG_fini(void)
{
    /* Uninstall hooks */
    post_parse_analyze_hook = prev_post_parse_analyze_hook;
    planner_hook = prev_planner_hook;
    ExecutorStart_hook = prev_ExecutorStart;
    ExecutorEnd_hook = prev_ExecutorEnd;

    elog(LOG, "pg_query_optimizer_tracer: extension unloaded");
}

/*
 * Enable the tracer for current session
 */
Datum
pg_tracer_enable(PG_FUNCTION_ARGS)
{
    tracer_enabled = true;
    PG_RETURN_BOOL(true);
}

/*
 * Disable the tracer for current session
 */
Datum
pg_tracer_disable(PG_FUNCTION_ARGS)
{
    tracer_enabled = false;
    PG_RETURN_BOOL(true);
}

/*
 * Check if tracer is enabled
 */
Datum
pg_tracer_is_enabled(PG_FUNCTION_ARGS)
{
    PG_RETURN_BOOL(tracer_enabled);
}

/*
 * Start tracing a query - generates unique session ID
 */
Datum
pg_trace_query_start(PG_FUNCTION_ARGS)
{
    text *query_text = PG_GETARG_TEXT_PP(0);
    char *query_str = text_to_cstring(query_text);
    char session_id[32];
    TimestampTz start_time;
    
    /* Generate unique session ID based on PID and timestamp */
    snprintf(session_id, sizeof(session_id), "%d-%lld", 
             MyProcPid, (long long)GetCurrentTimestamp());
    
    start_time = tracer_get_current_timestamp();
    
    /* Store initial session data */
    if (tracer_enabled)
    {
        MemoryContext oldcontext;
        oldcontext = MemoryContextSwitchTo(TopMemoryContext);
        
        /* Store session start info in TopMemoryContext */
        /* In production, this would insert into pg_trace_sessions table */
        
        MemoryContextSwitchTo(oldcontext);
        
        elog(LOG, "pg_query_optimizer_tracer: Starting trace for session %s", session_id);
    }
    
    /* Return session info as JSON */
    {
        StringInfoData buf;
        initStringInfo(&buf);
        appendStringInfo(&buf, "{\"session_id\": \"%s\", \"start_time\": \"%ld\"}",
                        session_id, (long)start_time);
        PG_RETURN_TEXT_P(cstring_to_text(buf.data));
    }
}

/*
 * End tracing a query - store final results
 */
Datum
pg_trace_query_end(PG_FUNCTION_ARGS)
{
    text *session_id_text = PG_GETARG_TEXT_PP(0);
    char *session_id = text_to_cstring(session_id_text);
    TimestampTz end_time;
    
    end_time = tracer_get_current_timestamp();
    
    if (tracer_enabled)
    {
        elog(LOG, "pg_query_optimizer_tracer: Ending trace for session %s", session_id);
        
        /* Cleanup session resources */
        tracer_cleanup();
    }
    
    /* Return completion info */
    {
        StringInfoData buf;
        initStringInfo(&buf);
        appendStringInfo(&buf, "{\"session_id\": \"%s\", \"end_time\": \"%ld\", \"status\": \"completed\"}",
                        session_id, (long)end_time);
        PG_RETURN_TEXT_P(cstring_to_text(buf.data));
    }
}

/*
 * Get stage data for a specific session
 */
Datum
pg_trace_get_stage_data(PG_FUNCTION_ARGS)
{
    text *session_id_text = PG_GETARG_TEXT_PP(0);
    text *stage_name_text = PG_GETARG_TEXT_PP(1);
    char *session_id = text_to_cstring(session_id_text);
    char *stage_name = text_to_cstring(stage_name_text);
    
    /* Return stored stage data */
    /* In production, this would query pg_trace_stages table */
    
    PG_RETURN_TEXT_P(cstring_to_text("{\"stage\": \"placeholder\", \"data\": {}}"));
}

/*
 * Hook: Post-parse analysis
 * Captures the parse tree and analysis results
 */
static void
tracer_post_parse_analyze_hook(ParseState *pstate, Query *query,
                               JumbleState *jstate)
{
    /* Call previous hook first */
    if (prev_post_parse_analyze_hook)
        prev_post_parse_analyze_hook(pstate, query, jstate);
    
    if (!tracer_enabled || !query)
        return;
    
    elog(LOG, "pg_query_optimizer_tracer: Capturing parse/analyze stage");
    
    /* Convert query tree to JSON for storage */
    if (query->commandType == CMD_SELECT)
    {
        char *query_json = query_tree_to_json(query);
        if (query_json)
        {
            tracer_store_stage_data("analyze", query_json);
            pfree(query_json);
        }
    }
}

/*
 * Hook: Query planner
 * Captures the query plan generation process
 */
static PlannedStmt *
tracer_planner_hook(Query *parse, const char *query_string,
                    int cursorOptions, ParamListInfo boundParams)
{
    PlannedStmt *result;
    TimestampTz plan_start;
    
    if (!tracer_enabled)
    {
        /* Call original planner */
        return standard_planner(parse, query_string, cursorOptions, boundParams);
    }
    
    plan_start = tracer_get_current_timestamp();
    
    elog(LOG, "pg_query_optimizer_tracer: Capturing planning stage");
    
    /* Store pre-plan query tree */
    if (parse)
    {
        char *query_json = query_tree_to_json(parse);
        if (query_json)
        {
            tracer_store_stage_data("plan_input", query_json);
            pfree(query_json);
        }
    }
    
    /* Call previous planner hook or standard planner */
    if (prev_planner_hook)
        result = prev_planner_hook(parse, query_string, cursorOptions, boundParams);
    else
        result = standard_planner(parse, query_string, cursorOptions, boundParams);
    
    /* Store the generated plan */
    if (result)
    {
        char *plan_json = plan_tree_to_json(result);
        if (plan_json)
        {
            tracer_store_stage_data("plan", plan_json);
            pfree(plan_json);
        }
    }
    
    return result;
}

/*
 * Hook: Executor start
 * Captures the beginning of query execution
 */
static void
tracer_ExecutorStart(QueryDesc *queryDesc, int eflags)
{
    if (!tracer_enabled)
    {
        if (prev_ExecutorStart)
            prev_ExecutorStart(queryDesc, eflags);
        else
            standard_ExecutorStart(queryDesc, eflags);
        return;
    }
    
    elog(LOG, "pg_query_optimizer_tracer: Executor starting");
    
    /* Store executor start information */
    {
        StringInfoData buf;
        initStringInfo(&buf);
        appendStringInfo(&buf, "{\"eflags\": %d, \"operation\": %d}", eflags, 
                        queryDesc->operation);
        tracer_store_stage_data("executor_start", buf.data);
        pfree(buf.data);
    }
    
    /* Call previous hook or standard executor start */
    if (prev_ExecutorStart)
        prev_ExecutorStart(queryDesc, eflags);
    else
        standard_ExecutorStart(queryDesc, eflags);
}

/*
 * Hook: Executor end
 * Captures the end of query execution
 */
static void
tracer_ExecutorEnd(QueryDesc *queryDesc)
{
    if (!tracer_enabled)
    {
        if (prev_ExecutorEnd)
            prev_ExecutorEnd(queryDesc);
        else
            standard_ExecutorEnd(queryDesc);
        return;
    }
    
    elog(LOG, "pg_query_optimizer_tracer: Executor ending");
    
    /* Store executor end information */
    {
        StringInfoData buf;
        initStringInfo(&buf);
        appendStringInfo(&buf, "{\"tuples_processed\": %ld, \"operation\": %d}",
                        queryDesc->estate->es_processed,
                        queryDesc->operation);
        tracer_store_stage_data("executor_end", buf.data);
        pfree(buf.data);
    }
    
    /* Call previous hook or standard executor end */
    if (prev_ExecutorEnd)
        prev_ExecutorEnd(queryDesc);
    else
        standard_ExecutorEnd(queryDesc);
}

/*
 * Initialize connection to trace storage
 */
static void
tracer_init_connection(void)
{
    /* Connection initialization logic */
    /* In production, this would establish connection to trace storage */
}

/*
 * Store stage data to trace storage
 */
static void
tracer_store_stage_data(const char *stage_name, const char *stage_data)
{
    /* Store data in temporary storage */
    /* In production, this would INSERT into pg_trace_stages table */
    elog(DEBUG1, "pg_query_optimizer_tracer: Storing %s stage data", stage_name);
}

/*
 * Convert Query tree to JSON string
 */
static char *
query_tree_to_json(Query *query)
{
    StringInfoData buf;
    const char *cmd_type;
    
    initStringInfo(&buf);
    
    /* Determine command type */
    switch (query->commandType)
    {
        case CMD_SELECT: cmd_type = "SELECT"; break;
        case CMD_UPDATE: cmd_type = "UPDATE"; break;
        case CMD_INSERT: cmd_type = "INSERT"; break;
        case CMD_DELETE: cmd_type = "DELETE"; break;
        case CMD_UTILITY: cmd_type = "UTILITY"; break;
        case CMD_NOTHING: cmd_type = "NOTHING"; break;
        default: cmd_type = "UNKNOWN"; break;
    }
    
    /* Build JSON representation */
    appendStringInfo(&buf,
        "{"
        "\"command_type\": \"%s\", "
        "\"has_aggs\": %s, "
        "\"has_window_funcs\": %s, "
        "\"has_sublinks\": %s, "
        "\"has_distinct_on\": %s, "
        "\"has_recursive\": %s, "
        "\"has_for_update\": %s, "
        "\"num_rtable_entries\": %d, "
        "\"num_jointree_items\": %d, "
        "\"num_target_list\": %d"
        "}",
        cmd_type,
        query->hasAggs ? "true" : "false",
        query->hasWindowFuncs ? "true" : "false",
        query->hasSubLinks ? "true" : "false",
        query->hasDistinctOn ? "true" : "false",
        query->hasRecursive ? "true" : "false",
        query->hasForUpdate ? "true" : "false",
        list_length(query->rtable),
        list_length(query->jointree->fromlist),
        list_length(query->targetList)
    );
    
    return buf.data;
}

/*
 * Convert PlannedStmt tree to JSON string
 */
static char *
plan_tree_to_json(PlannedStmt *plan)
{
    StringInfoData buf;
    
    initStringInfo(&buf);
    
    appendStringInfo(&buf,
        "{"
        "\"command_type\": %d, "
        "\"query_hash\": %lu, "
        "\"has_returning\": %s, "
        "\"can_set_tag\": %s, "
        "\"transient_plan\": %s, "
        "\"plan_tree\": {}"
        "}",
        plan->commandType,
        (unsigned long)plan->queryHash,
        plan->hasReturning ? "true" : "false",
        plan->canSetTag ? "true" : "false",
        plan->transientPlan ? "true" : "false"
    );
    
    return buf.data;
}

/*
 * Get current timestamp
 */
static TimestampTz
tracer_get_current_timestamp(void)
{
    return GetCurrentTimestamp();
}

/*
 * Cleanup tracer resources
 */
static void
tracer_cleanup(void)
{
    /* Cleanup any allocated resources */
    MemoryContextReset(TopTransactionContext);
}
