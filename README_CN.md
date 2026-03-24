# PG Query 可视化器

PostgreSQL 查询优化器可视化工具 - 逐步可视化查询优化过程

## 快速开始

### 一键安装

```bash
./install.sh
```

此脚本将：
- 检查 Node.js 版本（需要 18+）
- 安装 pnpm（如果未安装）
- 安装项目依赖
- 构建项目
- 创建默认配置文件

### 一键启动

```bash
# 启动开发环境（默认）
./start.sh

# 或启动生产环境
./start.sh prod
```

### 一键测试

```bash
# 运行所有测试
./test.sh

# 或运行特定测试
./test.sh type    # 只运行类型检查
./test.sh unit    # 只运行单元测试
./test.sh build   # 只运行构建测试
```

## 功能特性

- **查询分析器**: 输入 SQL 查询，可视化解析、分析、重写、计划、执行各阶段
- **实时模式**: 连接真实 PostgreSQL 数据库，实时分析查询优化过程
- **模拟模式**: 使用预设数据进行演示和学习
- **历史记录**: 浏览和管理过去的查询优化会话
- **会话对比**: 比较不同查询的优化路径和性能
- **统计信息**: 查看查询优化模式和性能指标的汇总分析

## 工作模式

### 模拟模式（默认）
- 无需数据库连接
- 使用预设的演示数据
- 适合学习和演示

### 实时模式
- 连接真实的 PostgreSQL 数据库
- 执行实际的查询分析
- 查看真实的执行计划和优化路径
- 自动保存分析历史

## 技术栈

- **前端**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **后端**: Node.js, Express, tRPC
- **数据库**: PostgreSQL (通过 drizzle ORM)

## 配置

编辑 `.env` 文件配置以下参数：

```env
# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# 数据库配置（PostgreSQL）
# 格式：postgresql://用户名：密码@主机：端口/数据库
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pg_query_demo

# 应用 ID
VITE_APP_ID=pg_query

# 分析配置（可选）
# VITE_ANALYTICS_ENDPOINT=
# VITE_ANALYTICS_WEBSITE_ID=
```

## 数据库设置

### 1. 安装 PostgreSQL 14+

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-14 postgresql-contrib-14

# macOS (Homebrew)
brew install postgresql@14
```

### 2. 创建数据库

```bash
sudo -u postgres psql
CREATE DATABASE pg_query_demo;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE pg_query_demo TO postgres;
\q
```

### 3. 运行数据库迁移

```bash
# 使用 pnpm
pnpm db:push

# 或手动执行 SQL
psql -U postgres -d pg_query_demo -f drizzle/0002_realtime_pg_query.sql
```

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test

# 数据库迁移
pnpm db:push
```

## 使用实时模式

1. 确保 PostgreSQL 数据库已启动并可访问
2. 在 `.env` 文件中配置正确的 `DATABASE_URL`
3. 启动应用：`./start.sh`
4. 在界面上切换到"实时模式"
5. 输入 SQL 查询并点击"开始分析"

### 示例查询

```sql
-- 连接查询
SELECT e.name, e.salary, d.name AS dept_name
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.salary > 60000
ORDER BY e.salary DESC
LIMIT 10;

-- 聚合查询
SELECT department, COUNT(*) as cnt,
  AVG(salary) as avg_salary,
  MAX(salary) as max_salary
FROM employees
GROUP BY department
HAVING COUNT(*) > 100
ORDER BY avg_salary DESC;

-- EXPLAIN 查看执行计划
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM employees
WHERE department = 'Engineering'
  AND salary BETWEEN 50000 AND 80000;
```

## 项目结构

```
pg-query/
├── client/              # 前端代码
│   └── src/
│       ├── components/  # React 组件
│       ├── pages/       # 页面组件
│       ├── hooks/       # 自定义 Hooks
│       └── lib/         # 工具库
├── server/              # 后端代码
│   ├── _core/          # 核心服务
│   ├── db.ts           # 数据库连接
│   └── queryAnalyzer.ts # 查询分析器
├── drizzle/            # 数据库迁移
│   ├── schema.ts       # 数据库模式
│   └── migrations/     # 迁移文件
├── shared/             # 共享类型
└── .env                # 环境变量配置
```

## 许可证

MIT
