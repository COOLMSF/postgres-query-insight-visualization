#!/bin/bash

# ============================================
# PG Query Visualizer - 一键安装和测试脚本
# ============================================
# 此脚本将自动安装 PostgreSQL、项目依赖，构建项目并运行测试

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 检查是否以 root 权限运行
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 sudo 运行此脚本：sudo ./install_and_test.sh"
        exit 1
    fi
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        print_error "无法检测操作系统版本"
        exit 1
    fi

    print_info "检测到操作系统：$OS $VERSION"
}

# 安装 PostgreSQL
install_postgresql() {
    print_info "正在安装 PostgreSQL 15..."

    case $OS in
        ubuntu|debian)
            # 添加 PostgreSQL 官方源
            apt-get update
            apt-get install -y wget ca-certificates
            wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
            
            # 添加源
            echo "deb http://apt.postgresql.org/pub/repos/apt/ $VERSION_CODENAME-pgdg main" > /etc/apt/sources.list.d/pgdg.list
            
            # 安装 PostgreSQL 15
            apt-get update
            apt-get install -y postgresql-15 postgresql-contrib-15 postgresql-client-15
            ;;
        centos|rhel|rocky|almalinux)
            # 添加 PostgreSQL 官方源
            yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-$VERSION-x86_64/pgdg-redhat-repo-latest.noarch.rpm
            yum install -y epel-release
            
            # 安装 PostgreSQL 15
            yum install -y postgresql15 postgresql15-server postgresql15-contrib postgresql15-libs
            ;;
        amazon)
            # Amazon Linux 使用官方源
            yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
            yum install -y postgresql15 postgresql15-server postgresql15-contrib
            ;;
        *)
            print_error "不支持的操作系统：$OS"
            exit 1
            ;;
    esac

    print_success "PostgreSQL 15 安装完成"
}

# 配置 PostgreSQL
configure_postgresql() {
    print_info "正在配置 PostgreSQL..."

    # 启动 PostgreSQL 服务
    case $OS in
        ubuntu|debian)
            systemctl start postgresql
            systemctl enable postgresql
            ;;
        centos|rhel|rocky|almalinux|amazon)
            systemctl start postgresql-15
            systemctl enable postgresql-15
            ;;
    esac

    # 等待 PostgreSQL 启动
    sleep 2

    # 设置 postgres 用户密码
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true

    # 创建数据库
    sudo -u postgres psql -c "CREATE DATABASE pg_query_demo;" 2>/dev/null || true

    print_success "PostgreSQL 配置完成"
}

# 检查 Node.js
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "未检测到 Node.js，请先安装 Node.js 18+"
        echo "访问 https://nodejs.org/ 下载安装"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 版本过低 (当前：$(node -v))，需要 Node.js 18+"
        exit 1
    fi

    print_success "Node.js 版本检查通过：$(node -v)"
}

# 检查 pnpm
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_warning "未检测到 pnpm，正在安装..."
        npm install -g pnpm
    fi

    print_success "pnpm 版本：$(pnpm -v)"
}

# 创建 .env 文件
create_env_file() {
    if [ ! -f .env ]; then
        print_info "创建默认 .env 配置文件..."
        cat > .env << 'EOF'
# PG Query Visualizer 配置文件

# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# 数据库配置 (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pg_query_demo

# JWT 密钥 (生产环境请修改为随机字符串)
JWT_SECRET=your-secret-key-change-in-production

# 会话密钥
SESSION_SECRET=your-session-secret-change-in-production

# 应用 ID (用于会话管理)
VITE_APP_ID=pg-query

# 分析配置（可选）
# VITE_ANALYTICS_ENDPOINT=
# VITE_ANALYTICS_WEBSITE_ID=
EOF
        print_success ".env 文件已创建"
    else
        print_warning ".env 文件已存在，跳过创建"
    fi
}

# 安装依赖
install_dependencies() {
    print_info "正在安装项目依赖..."
    pnpm install

    if [ $? -eq 0 ]; then
        print_success "依赖安装完成"
    else
        print_error "依赖安装失败"
        exit 1
    fi
}

# 运行数据库迁移
run_db_migrations() {
    print_info "正在执行数据库迁移..."
    set -a
    source .env
    set +a

    if pnpm db:push; then
        print_success "数据库迁移完成"
    else
        print_error "数据库迁移失败"
        exit 1
    fi
}

# 创建实时模式演示表和数据
seed_realtime_demo_data() {
    print_info "正在创建实时模式演示数据..."

    sudo -u postgres psql -d pg_query_demo <<'SQL'
CREATE TABLE IF NOT EXISTS demo_departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS demo_employees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES demo_departments(id),
    department TEXT NOT NULL,
    salary INTEGER NOT NULL CHECK (salary > 0)
);

INSERT INTO demo_departments (name)
VALUES ('Engineering'), ('Sales'), ('HR'), ('Finance')
ON CONFLICT (name) DO NOTHING;

INSERT INTO demo_employees (name, department_id, department, salary)
SELECT e.name, d.id, d.name, e.salary
FROM (
    VALUES
      ('Alice', 'Engineering', 90000),
      ('Bob', 'Engineering', 78000),
      ('Carol', 'Engineering', 65000),
      ('David', 'Sales', 62000),
      ('Eva', 'Sales', 71000),
      ('Frank', 'HR', 56000),
      ('Grace', 'Finance', 83000),
      ('Henry', 'Finance', 72000)
) AS e(name, department, salary)
JOIN demo_departments d ON d.name = e.department
WHERE NOT EXISTS (
    SELECT 1 FROM demo_employees de WHERE de.name = e.name
);
SQL

    print_success "演示数据准备完成"
}

# 检查实时模式数据库连通性
verify_realtime_ready() {
    print_info "正在验证实时模式数据库连通性..."
    if sudo -u postgres psql -d pg_query_demo -c "SELECT COUNT(*) AS employee_count FROM demo_employees;" >/dev/null 2>&1; then
        print_success "实时模式数据库验证通过"
    else
        print_error "实时模式数据库验证失败"
        exit 1
    fi
}

# 构建项目
build_project() {
    print_info "正在构建项目..."
    pnpm build

    if [ $? -eq 0 ]; then
        print_success "项目构建完成"
    else
        print_error "项目构建失败"
        exit 1
    fi
}

# 运行类型检查
run_type_check() {
    print_info "正在运行 TypeScript 类型检查..."
    if pnpm check; then
        print_success "类型检查通过"
    else
        print_error "类型检查失败"
        return 1
    fi
}

# 运行单元测试
run_tests() {
    print_info "正在运行单元测试..."
    if pnpm test; then
        print_success "所有测试通过"
    else
        print_error "测试失败"
        return 1
    fi
}

# 显示使用说明
show_usage() {
    echo "用法：./install_and_test.sh [选项]"
    echo ""
    echo "选项:"
    echo "  all         安装所有依赖并运行测试（默认）"
    echo "  install     只安装（PostgreSQL + 依赖 + 迁移 + 演示数据 + 构建）"
    echo "  realtime    仅准备实时模式（PostgreSQL + 迁移 + 演示数据）"
    echo "  test        只运行测试（需要先安装）"
    echo "  pg-only     只安装和配置 PostgreSQL"
    echo "  -h, help    显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  sudo ./install_and_test.sh          # 完整安装和测试"
    echo "  sudo ./install_and_test.sh all      # 完整安装和测试"
    echo "  sudo ./install_and_test.sh install  # 只安装"
    echo "  sudo ./install_and_test.sh realtime # 只准备实时模式"
    echo "  ./install_and_test.sh test          # 只运行测试"
    echo "  sudo ./install_and_test.sh pg-only  # 只安装 PostgreSQL"
    echo ""
}

# 主函数
main() {
    echo "============================================"
    echo "  PG Query Visualizer - 安装和测试脚本"
    echo "============================================"
    echo ""

    # 解析参数
    case "${1:-all}" in
        -h|--help)
            show_usage
            exit 0
            ;;
        pg-only)
            check_root
            detect_os
            install_postgresql
            configure_postgresql
            echo ""
            print_success "PostgreSQL 安装完成！"
            exit 0
            ;;
        realtime)
            check_root
            detect_os
            echo ""

            install_postgresql
            echo ""

            configure_postgresql
            echo ""

            check_nodejs
            echo ""

            check_pnpm
            echo ""

            create_env_file
            echo ""

            install_dependencies
            echo ""

            run_db_migrations
            echo ""

            seed_realtime_demo_data
            echo ""

            verify_realtime_ready
            echo ""

            print_success "实时模式环境已准备完成！"
            print_info "下一步运行：./start.sh"
            exit 0
            ;;
        test)
            # 只运行测试，不需要 root 权限
            print_info "运行测试套件..."
            echo ""
            
            if [ ! -d "node_modules" ]; then
                print_error "未检测到 node_modules，请先运行安装"
                exit 1
            fi
            
            FAILED=0
            run_type_check || FAILED=1
            echo ""
            run_tests || FAILED=1
            echo ""
            
            if [ $FAILED -eq 0 ]; then
                print_success "所有测试通过！"
            else
                print_error "部分测试失败"
                exit 1
            fi
            exit 0
            ;;
        install|all)
            check_root
            detect_os
            echo ""
            
            # 1. 安装 PostgreSQL
            install_postgresql
            echo ""
            
            # 2. 配置 PostgreSQL
            configure_postgresql
            echo ""
            
            # 3. 检查 Node.js
            check_nodejs
            echo ""
            
            # 4. 检查 pnpm
            check_pnpm
            echo ""
            
            # 5. 创建 .env 文件
            create_env_file
            echo ""
            
            # 6. 安装依赖
            install_dependencies
            echo ""
            
            # 7. 数据库迁移
            run_db_migrations
            echo ""

            # 8. 准备演示数据（实时模式）
            seed_realtime_demo_data
            echo ""

            # 9. 验证实时模式
            verify_realtime_ready
            echo ""

            # 10. 构建项目
            build_project
            echo ""
            
            # 11. 运行测试（仅当选择 all 时）
            if [ "${1:-all}" = "all" ]; then
                print_info "运行测试套件..."
                echo ""
                
                FAILED=0
                run_type_check || FAILED=1
                echo ""
                run_tests || FAILED=1
                echo ""
                
                if [ $FAILED -eq 0 ]; then
                    print_success "所有测试通过！"
                else
                    print_warning "部分测试失败"
                fi
            fi
            ;;
        *)
            print_error "未知选项：$1"
            show_usage
            exit 1
            ;;
    esac

    echo "============================================"
    print_success "安装完成！"
    echo "============================================"
    echo ""
    print_info "启动服务请运行：./start.sh"
    print_info "运行测试请运行：./test.sh"
    echo ""
}

# 执行主函数
main "$@"
