# pg_query_optimizer_tracer

PostgreSQL Query Optimizer Tracer Extension - 查询优化器追踪扩展

## 概述

`pg_query_optimizer_tracer` 是一个 PostgreSQL C 语言扩展，通过挂钩 (hook) PostgreSQL 查询处理管道的各个阶段，实时捕获和记录查询优化过程的详细信息。

## 架构设计

### 扩展钩子 (Hooks)

本扩展利用 PostgreSQL 提供的钩子机制，在不修改核心源码的前提下，拦截查询处理流程：

```
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Query Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SQL Text                                                        │
│    │                                                             │
│    ▼                                                             │
│  ┌─────────────┐                                                │
│  │   Parser    │ ◄─── post_parse_analyze_hook                  │
│  └─────────────┘                                                │
│    │                                                           │
│    ▼                                                           │
│  ┌─────────────┐                                                │
│  │   Analyzer  │ ◄─── 捕获解析树和分析结果                      │
│  └─────────────┘                                                │
│    │                                                           │
│    ▼                                                           │
│  ┌─────────────┐                                                │
│  │   Rewriter  │ ◄─── 捕获重写后的查询树                        │
│  └─────────────┘                                                │
│    │                                                           │
│    ▼                                                           │
│  ┌─────────────┐                                                │
│  │   Planner   │ ◄─── planner_hook (最关键的优化阶段)           │
│  │             │     - 生成候选执行计划                         │
│  │             │     - 成本估算                                 │
│  │             │     - 选择最优计划                             │
│  └─────────────┘                                                │
│    │                                                           │
│    ▼                                                           │
│  ┌─────────────┐                                                │
│  │  Executor   │ ◄─── ExecutorStart_hook / ExecutorEnd_hook    │
│  │             │     - 执行开始/结束追踪                        │
│  │             │     - 实际执行统计                             │
│  └─────────────┘                                                │
│    │                                                           │
│    ▼                                                           │
│  Results                                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 核心钩子函数

| 钩子函数 | 拦截点 | 捕获数据 |
|---------|--------|----------|
| `post_parse_analyze_hook` | 解析/分析完成后 | 解析树、查询树、语义分析结果 |
| `planner_hook` | 查询规划器 | 候选计划、成本估算、最终执行计划 |
| `ExecutorStart_hook` | 执行器启动时 | 执行器配置、操作类型 |
| `ExecutorEnd_hook` | 执行器结束时 | 实际处理行数、执行时间 |

## 安装

### 前置要求

- PostgreSQL 14+
- PostgreSQL 服务器开发头文件
- GCC 编译器

### Ubuntu/Debian

```bash
# 安装开发依赖
sudo apt-get install postgresql-server-dev-14 build-essential

# 编译安装扩展
cd pg_extension
make USE_PGXS=1
sudo make USE_PGXS=1 install

# 在目标数据库中创建扩展
psql -d your_database -c "CREATE EXTENSION pg_query_optimizer_tracer;"
```

### CentOS/RHEL

```bash
# 安装开发依赖
sudo yum install postgresql-devel gcc

# 编译安装扩展
cd pg_extension
make USE_PGXS=1
sudo make USE_PGXS=1 install

# 在目标数据库中创建扩展
psql -d your_database -c "CREATE EXTENSION pg_query_optimizer_tracer;"
```

### macOS (Homebrew)

```bash
# 安装 PostgreSQL
brew install postgresql@14

# 编译安装扩展
cd pg_extension
make USE_PGXS=1
make USE_PGXS=1 install

# 在目标数据库中创建扩展
psql -d your_database -c "CREATE EXTENSION pg_query_optimizer_tracer;"
```

### 使用安装脚本

```bash
# 一键安装
cd pg_extension
./install_extension.sh

# 或指定数据库
./install_extension.sh your_database
```

## 使用

### 启用/禁用追踪

```sql
-- 启用追踪
SELECT pg_tracer_enable();

-- 禁用追踪
SELECT pg_tracer_disable();

-- 检查追踪状态
SELECT pg_tracer_is_enabled();
```

### 配置参数

在 `postgresql.conf` 中配置：

```conf
# 启用追踪
pg_query_optimizer_tracer.enabled = on

# 设置追踪数据存储连接（可选）
pg_query_optimizer_tracer.connection_string = 'postgresql://user:pass@localhost/db'
```

或在会话中动态设置：

```sql
SET pg_query_optimizer_tracer.enabled = on;
```

### 查询追踪数据

```sql
-- 查看所有追踪会话
SELECT * FROM pg_trace_sessions_view;

-- 查看特定会话的详细阶段
SELECT * FROM pg_trace_stages 
WHERE session_id = 1 
ORDER BY stage_seq;

-- 查看执行计划路径
SELECT * FROM pg_trace_paths 
WHERE session_id = 1;

-- 查看阶段汇总
SELECT * FROM pg_trace_stage_summary;
```

## 数据表结构

### pg_trace_sessions

存储查询会话信息：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| session_id | TEXT | 唯一会话标识符 |
| query_text | TEXT | 原始 SQL 查询 |
| query_hash | BIGINT | 查询哈希值 |
| start_time | TIMESTAMPTZ | 开始时间 |
| end_time | TIMESTAMPTZ | 结束时间 |
| total_duration_ms | REAL | 总耗时 (毫秒) |
| status | TEXT | 状态 (running/completed/error) |
| pid | INTEGER | 后端进程 ID |

### pg_trace_stages

存储各优化阶段数据：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| session_id | INTEGER | 会话 ID |
| stage_seq | INTEGER | 阶段序号 |
| stage_name | TEXT | 阶段名称 (parse/analyze/rewrite/plan/execute) |
| stage_data | JSONB | 阶段详细数据 |
| plan_tree | TEXT | 计划树表示 |
| explain_output | TEXT | EXPLAIN 输出 |
| estimated_cost | REAL | 估算成本 |
| actual_duration_ms | REAL | 实际耗时 |

### pg_trace_paths

存储候选执行计划路径：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| stage_id | INTEGER | 所属阶段 ID |
| path_type | TEXT | 路径类型 |
| path_description | TEXT | 路径描述 |
| total_cost | REAL | 总成本 |
| startup_cost | REAL | 启动成本 |
| rows_estimate | INTEGER | 行数估算 |
| is_selected | BOOLEAN | 是否被选中 |
| path_data | JSONB | 完整路径数据 |

## 实现细节

### 钩子链机制

本扩展遵循 PostgreSQL 的钩子链设计，正确调用前一个钩子处理器：

```c
static void
tracer_post_parse_analyze_hook(ParseState *pstate, Query *query,
                               JumbleState *jstate)
{
    /* 先调用前一个钩子 */
    if (prev_post_parse_analyze_hook)
        prev_post_parse_analyze_hook(pstate, query, jstate);
    
    /* 然后执行我们的追踪逻辑 */
    if (!tracer_enabled || !query)
        return;
    
    /* 捕获查询树数据 */
    // ...
}
```

### 查询树序列化

将 PostgreSQL 内部的 `Query` 结构体转换为 JSON 格式存储：

```c
static char *
query_tree_to_json(Query *query)
{
    StringInfoData buf;
    initStringInfo(&buf);
    
    appendStringInfo(&buf,
        "{"
        "\"command_type\": \"%s\", "
        "\"has_aggs\": %s, "
        "\"num_rtable_entries\": %d"
        "}",
        cmd_type,
        query->hasAggs ? "true" : "false",
        list_length(query->rtable)
    );
    
    return buf.data;
}
```

### 内存管理

使用 PostgreSQL 的内存上下文管理：

```c
MemoryContext oldcontext;
oldcontext = MemoryContextSwitchTo(TopMemoryContext);

/* 分配需要长期保存的数据 */

MemoryContextSwitchTo(oldcontext);
```

## 性能影响

- **开发/测试环境**: 建议启用，完整记录所有优化阶段
- **生产环境**: 建议禁用或仅针对特定查询启用

性能开销主要来自：
1. JSON 序列化操作
2. 数据库写入操作
3. 额外的内存分配

## 故障排除

### 扩展加载失败

```sql
-- 检查扩展是否安装
SELECT * FROM pg_available_extensions WHERE name = 'pg_query_optimizer_tracer';

-- 检查已加载的扩展
SELECT * FROM pg_extension;
```

### 查看日志

```bash
# PostgreSQL 日志通常位于
/var/log/postgresql/postgresql-14-main.log  # Ubuntu/Debian
/var/lib/pgsql/14/data/log/postgresql.log   # CentOS/RHEL
```

### 重新编译

```bash
cd pg_extension
make clean
make USE_PGXS=1
sudo make USE_PGXS=1 install
```

## 许可证

PostgreSQL License

## 参考资料

- [PostgreSQL Hook Mechanism](https://www.postgresql.org/docs/current/dynamic-trace.html)
- [PostgreSQL Source Tree](https://github.com/postgres/postgres)
- [PG Query Extension](https://github.com/pganalyze/pg_query)
