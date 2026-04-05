#!/bin/bash

# ============================================
# PG Query Visualizer - 一键安装脚本
# ============================================
# 此脚本将安装所有必要依赖，配置 PostgreSQL 数据库，
# 运行迁移，创建演示数据，确保 start.sh 可以直接启动。

set -e  # 遇到错误立即退出

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认数据库配置（与 .env 保持一致）
DB_USER="postgres"
DB_PASS="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="pg_query_demo"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

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

# ============================================
# 1. 检查是否以 root/sudo 运行（安装系统包需要）
# ============================================
USE_SUDO=""
check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        USE_SUDO=""
    elif command -v sudo &> /dev/null; then
        USE_SUDO="sudo"
    else
        print_warning "非 root 用户且无 sudo，系统包安装可能失败"
    fi
}

# ============================================
# 2. 检测操作系统
# ============================================
OS=""
VERSION_CODENAME_VAL=""
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION_CODENAME_VAL=${VERSION_CODENAME:-$VERSION_ID}
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        print_error "无法检测操作系统版本"
        exit 1
    fi
    print_info "检测到操作系统：$OS"
}

# ============================================
# 3. 检查/安装 Node.js
# ============================================
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_warning "未检测到 Node.js，尝试安装 Node.js 20 LTS..."
        case $OS in
            ubuntu|debian)
                $USE_SUDO apt-get update -qq
                $USE_SUDO apt-get install -y -qq curl
                curl -fsSL https://deb.nodesource.com/setup_20.x | $USE_SUDO bash -
                $USE_SUDO apt-get install -y -qq nodejs
                ;;
            centos|rhel|rocky|almalinux|amazon)
                curl -fsSL https://rpm.nodesource.com/setup_20.x | $USE_SUDO bash -
                $USE_SUDO yum install -y nodejs
                ;;
            macos)
                if command -v brew &> /dev/null; then
                    brew install node@20
                else
                    print_error "请安装 Homebrew 后重试，或手动安装 Node.js 18+"
                    print_error "  https://nodejs.org/"
                    exit 1
                fi
                ;;
            *)
                print_error "请手动安装 Node.js 18+：https://nodejs.org/"
                exit 1
                ;;
        esac
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 版本过低 (当前：$(node -v))，需要 Node.js 18+"
        exit 1
    fi

    print_success "Node.js 版本：$(node -v)"
}

# ============================================
# 4. 检查/安装 pnpm
# ============================================
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_warning "未检测到 pnpm，正在安装..."
        npm install -g pnpm
    fi

    print_success "pnpm 版本：$(pnpm -v)"
}

# ============================================
# 5. 检查/安装 PostgreSQL
# ============================================
install_postgresql() {
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL 已安装：$(psql --version)"
        return 0
    fi

    print_warning "未检测到 PostgreSQL，正在安装..."

    case $OS in
        ubuntu|debian)
            $USE_SUDO apt-get update -qq
            $USE_SUDO apt-get install -y -qq postgresql postgresql-contrib
            ;;
        centos|rhel|rocky|almalinux)
            $USE_SUDO yum install -y postgresql-server postgresql-contrib
            $USE_SUDO postgresql-setup --initdb 2>/dev/null || true
            ;;
        amazon)
            $USE_SUDO yum install -y postgresql-server postgresql-contrib
            $USE_SUDO postgresql-setup --initdb 2>/dev/null || true
            ;;
        macos)
            if command -v brew &> /dev/null; then
                brew install postgresql@15
                brew services start postgresql@15
            else
                print_error "请安装 Homebrew 后重试，或手动安装 PostgreSQL"
                exit 1
            fi
            ;;
        *)
            print_error "请手动安装 PostgreSQL：https://www.postgresql.org/download/"
            exit 1
            ;;
    esac

    print_success "PostgreSQL 安装完成"
}

# ============================================
# 6. 确保 PostgreSQL 服务运行
# ============================================
ensure_pg_running() {
    print_info "确保 PostgreSQL 服务正在运行..."

    # macOS with Homebrew
    if [[ "$OS" == "macos" ]]; then
        brew services start postgresql@15 2>/dev/null || brew services start postgresql 2>/dev/null || true
        sleep 2
        print_success "PostgreSQL 服务已启动 (Homebrew)"
        return 0
    fi

    # Linux: try systemctl first, then pg_ctlcluster, then pg_ctl
    if command -v systemctl &> /dev/null; then
        $USE_SUDO systemctl start postgresql 2>/dev/null || \
        $USE_SUDO systemctl start postgresql-15 2>/dev/null || \
        $USE_SUDO systemctl start postgresql-16 2>/dev/null || true
        $USE_SUDO systemctl enable postgresql 2>/dev/null || true
    elif command -v pg_ctlcluster &> /dev/null; then
        PG_VER=$(pg_lsclusters -h 2>/dev/null | head -1 | awk '{print $1}')
        if [ -n "$PG_VER" ]; then
            $USE_SUDO pg_ctlcluster "$PG_VER" main start 2>/dev/null || true
        fi
    elif command -v pg_ctl &> /dev/null; then
        pg_ctl start -D /var/lib/pgsql/data 2>/dev/null || true
    fi

    sleep 2

    # Verify it's running
    if $USE_SUDO -u postgres pg_isready -q 2>/dev/null || pg_isready -q 2>/dev/null; then
        print_success "PostgreSQL 服务正在运行"
    else
        print_warning "无法确认 PostgreSQL 是否运行，继续尝试..."
    fi
}

# ============================================
# 7. 配置 pg_hba.conf 允许密码登录
# ============================================
configure_pg_hba() {
    print_info "配置 PostgreSQL 认证方式..."

    # Find pg_hba.conf
    PG_HBA=""
    for candidate in \
        /etc/postgresql/*/main/pg_hba.conf \
        /var/lib/pgsql/data/pg_hba.conf \
        /var/lib/pgsql/*/data/pg_hba.conf \
        /usr/local/var/postgres/pg_hba.conf \
        /opt/homebrew/var/postgresql@15/pg_hba.conf; do
        if [ -f "$candidate" ]; then
            PG_HBA="$candidate"
            break
        fi
    done

    if [ -z "$PG_HBA" ]; then
        # Try to find via psql
        PG_HBA=$($USE_SUDO -u postgres psql -t -c "SHOW hba_file;" 2>/dev/null | xargs)
    fi

    if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
        print_warning "无法找到 pg_hba.conf，跳过认证配置"
        return 0
    fi

    # Check if md5/scram-sha-256 is already set for local connections
    if grep -qE "^(local|host)\s+all\s+all\s+.*\s+(md5|scram-sha-256|trust)" "$PG_HBA" 2>/dev/null; then
        print_success "pg_hba.conf 已配置密码认证"
        return 0
    fi

    # Backup and update: change 'peer' and 'ident' to 'md5' for local connections
    $USE_SUDO cp "$PG_HBA" "${PG_HBA}.bak.$(date +%s)"
    $USE_SUDO sed -i 's/^\(local\s\+all\s\+all\s\+\)peer/\1md5/' "$PG_HBA" 2>/dev/null || true
    $USE_SUDO sed -i 's/^\(host\s\+all\s\+all\s\+127\.0\.0\.1\/32\s\+\)ident/\1md5/' "$PG_HBA" 2>/dev/null || true
    $USE_SUDO sed -i 's/^\(host\s\+all\s\+all\s\+::1\/128\s\+\)ident/\1md5/' "$PG_HBA" 2>/dev/null || true

    # Reload PostgreSQL to apply
    if command -v systemctl &> /dev/null; then
        $USE_SUDO systemctl reload postgresql 2>/dev/null || \
        $USE_SUDO systemctl reload postgresql-15 2>/dev/null || true
    else
        $USE_SUDO -u postgres pg_ctl reload -D "$(dirname "$PG_HBA")" 2>/dev/null || true
    fi

    sleep 1
    print_success "pg_hba.conf 已更新为 md5 认证"
}

# ============================================
# 8. 配置 PostgreSQL 用户和数据库
# ============================================
setup_database() {
    print_info "配置 PostgreSQL 用户和数据库..."

    # Set postgres user password
    $USE_SUDO -u postgres psql -c "ALTER USER postgres PASSWORD '${DB_PASS}';" 2>/dev/null || \
        psql -U postgres -c "ALTER USER postgres PASSWORD '${DB_PASS}';" 2>/dev/null || \
        print_warning "无法设置 postgres 密码（可能已设置）"

    # Create database if not exists
    if $USE_SUDO -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_success "数据库 ${DB_NAME} 已存在"
    else
        $USE_SUDO -u postgres psql -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || \
            psql -U postgres -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || \
            PGPASSWORD="${DB_PASS}" createdb -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" "${DB_NAME}" 2>/dev/null || {
                print_error "无法创建数据库 ${DB_NAME}"
                exit 1
            }
        print_success "数据库 ${DB_NAME} 已创建"
    fi

    # Quick connectivity test
    if PGPASSWORD="${DB_PASS}" psql -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}" -c "SELECT 1;" &>/dev/null; then
        print_success "数据库连接测试通过"
    else
        print_error "无法连接数据库，请检查 PostgreSQL 配置"
        print_error "  连接串：${DATABASE_URL}"
        exit 1
    fi
}

# ============================================
# 9. 创建 .env 文件
# ============================================
create_env_file() {
    if [ ! -f .env ]; then
        print_info "创建默认 .env 配置文件..."
        cat > .env << EOF
# PG Query Visualizer 配置文件

# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# 数据库配置 (PostgreSQL)
DATABASE_URL=${DATABASE_URL}

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

# ============================================
# 10. 安装 Node.js 依赖
# ============================================
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

# ============================================
# 11. 运行数据库迁移 (Drizzle)
# ============================================
run_db_migrations() {
    print_info "正在运行数据库迁移..."

    # Source .env so DATABASE_URL is available for drizzle-kit
    set -a
    source .env
    set +a

    # Run drizzle-kit migrate (uses drizzle/meta/_journal.json + SQL files)
    if npx drizzle-kit migrate 2>&1; then
        print_success "数据库迁移完成"
    else
        print_warning "drizzle-kit migrate 失败，尝试直接执行 SQL..."
        # Fallback: apply the generated SQL directly
        for sql_file in drizzle/0*.sql; do
            if [ -f "$sql_file" ]; then
                print_info "执行 $sql_file ..."
                PGPASSWORD="${DB_PASS}" psql -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}" -f "$sql_file" 2>/dev/null || true
            fi
        done
        print_success "SQL 迁移已直接执行"
    fi
}

# ============================================
# 12. 创建演示表和数据
# ============================================
seed_demo_data() {
    print_info "正在创建演示数据..."

    PGPASSWORD="${DB_PASS}" psql -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}" <<'SQL'
-- 演示部门表
CREATE TABLE IF NOT EXISTS demo_departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- 演示员工表
CREATE TABLE IF NOT EXISTS demo_employees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES demo_departments(id),
    department TEXT NOT NULL,
    salary INTEGER NOT NULL CHECK (salary > 0)
);

-- 创建索引加速查询演示
CREATE INDEX IF NOT EXISTS idx_demo_employees_department ON demo_employees(department);
CREATE INDEX IF NOT EXISTS idx_demo_employees_salary ON demo_employees(salary);

-- 插入部门数据
INSERT INTO demo_departments (name)
VALUES ('Engineering'), ('Sales'), ('HR'), ('Finance'), ('Marketing')
ON CONFLICT (name) DO NOTHING;

-- 插入员工数据
INSERT INTO demo_employees (name, department_id, department, salary)
SELECT e.name, d.id, d.name, e.salary
FROM (
    VALUES
      ('Alice',   'Engineering', 90000),
      ('Bob',     'Engineering', 78000),
      ('Carol',   'Engineering', 65000),
      ('David',   'Sales',       62000),
      ('Eva',     'Sales',       71000),
      ('Frank',   'HR',          56000),
      ('Grace',   'Finance',     83000),
      ('Henry',   'Finance',     72000),
      ('Ivy',     'Marketing',   68000),
      ('Jack',    'Marketing',   59000)
) AS e(name, department, salary)
JOIN demo_departments d ON d.name = e.department
WHERE NOT EXISTS (
    SELECT 1 FROM demo_employees de WHERE de.name = e.name
);
SQL

    if [ $? -eq 0 ]; then
        print_success "演示数据准备完成"
    else
        print_warning "演示数据创建可能部分失败（如已存在）"
    fi
}

# ============================================
# 13. 验证环境就绪
# ============================================
verify_ready() {
    print_info "正在验证安装..."
    FAILED=0

    # Check node_modules
    if [ -d "node_modules" ]; then
        print_success "  ✔ node_modules 存在"
    else
        print_error "  ✘ node_modules 不存在"
        FAILED=1
    fi

    # Check .env
    if [ -f ".env" ]; then
        print_success "  ✔ .env 文件存在"
    else
        print_error "  ✘ .env 文件不存在"
        FAILED=1
    fi

    # Check database connectivity
    if PGPASSWORD="${DB_PASS}" psql -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}" -c "SELECT 1;" &>/dev/null; then
        print_success "  ✔ 数据库连接正常"
    else
        print_error "  ✘ 数据库连接失败"
        FAILED=1
    fi

    # Check app tables exist
    if PGPASSWORD="${DB_PASS}" psql -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}" -c "SELECT COUNT(*) FROM query_sessions;" &>/dev/null; then
        print_success "  ✔ 应用数据表已就绪"
    else
        print_error "  ✘ 应用数据表缺失"
        FAILED=1
    fi

    # Check demo tables exist
    if PGPASSWORD="${DB_PASS}" psql -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}" -c "SELECT COUNT(*) FROM demo_employees;" &>/dev/null; then
        DEMO_COUNT=$(PGPASSWORD="${DB_PASS}" psql -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM demo_employees;" 2>/dev/null | xargs)
        print_success "  ✔ 演示数据就绪 (${DEMO_COUNT} 条记录)"
    else
        print_error "  ✘ 演示数据表缺失"
        FAILED=1
    fi

    if [ $FAILED -ne 0 ]; then
        print_error "验证未全部通过，请检查上方错误信息"
        exit 1
    fi

    print_success "所有验证通过！"
}

# ============================================
# 显示使用说明
# ============================================
show_usage() {
    echo "用法：./install.sh [选项]"
    echo ""
    echo "选项:"
    echo "  full        完整安装（默认）：系统依赖 + 数据库 + 项目依赖 + 迁移 + 演示数据"
    echo "  deps-only   仅安装项目依赖（跳过 PostgreSQL 安装）"
    echo "  db-only     仅配置数据库 + 迁移 + 演示数据"
    echo "  -h, help    显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./install.sh              # 完整安装"
    echo "  ./install.sh deps-only    # 仅安装项目依赖（已有 PostgreSQL）"
    echo "  ./install.sh db-only      # 仅数据库配置和迁移"
    echo ""
}

# ============================================
# 主函数
# ============================================
main() {
    echo "============================================"
    echo "  PG Query Visualizer - 一键安装脚本"
    echo "============================================"
    echo ""

    case "${1:-full}" in
        -h|--help|help)
            show_usage
            exit 0
            ;;
        deps-only)
            print_info "仅安装项目依赖模式..."
            echo ""
            check_nodejs
            echo ""
            check_pnpm
            echo ""
            create_env_file
            echo ""
            install_dependencies
            echo ""
            ;;
        db-only)
            print_info "仅数据库配置模式..."
            echo ""
            check_sudo
            detect_os
            echo ""
            ensure_pg_running
            echo ""
            configure_pg_hba
            echo ""
            setup_database
            echo ""
            create_env_file
            echo ""
            run_db_migrations
            echo ""
            seed_demo_data
            echo ""
            verify_ready
            echo ""
            ;;
        full|"")
            print_info "开始完整安装流程..."
            echo ""

            # Step 1: System detection
            check_sudo
            detect_os
            echo ""

            # Step 2: Node.js
            check_nodejs
            echo ""

            # Step 3: pnpm
            check_pnpm
            echo ""

            # Step 4: PostgreSQL install
            install_postgresql
            echo ""

            # Step 5: Ensure PG is running
            ensure_pg_running
            echo ""

            # Step 6: Configure pg_hba.conf for password auth
            configure_pg_hba
            echo ""

            # Step 7: Create database and user
            setup_database
            echo ""

            # Step 8: .env file
            create_env_file
            echo ""

            # Step 9: Install Node.js dependencies
            install_dependencies
            echo ""

            # Step 10: Database migrations
            run_db_migrations
            echo ""

            # Step 11: Seed demo data
            seed_demo_data
            echo ""

            # Step 12: Verify everything
            verify_ready
            echo ""
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
    print_info "启动开发环境：./start.sh"
    print_info "启动生产环境：./start.sh prod"
    echo ""
}

# 执行主函数
main "$@"
