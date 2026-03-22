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
- **历史记录**: 浏览和管理过去的查询优化会话
- **会话对比**: 比较不同查询的优化路径和性能
- **统计信息**: 查看查询优化模式和性能指标的汇总分析

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

# 数据库配置
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pg_query_demo

# JWT 密钥（生产环境请修改）
JWT_SECRET=your-secret-key-change-in-production

# 会话密钥
SESSION_SECRET=your-session-secret-change-in-production
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
```

## 许可证

MIT
