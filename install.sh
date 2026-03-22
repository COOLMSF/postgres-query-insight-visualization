#!/bin/bash

# ============================================
# PG Query Visualizer - 一键安装脚本
# ============================================
# 此脚本将自动安装所有依赖并构建项目

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

# 检查是否已安装 Node.js
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

# 检查是否已安装 pnpm
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_warning "未检测到 pnpm，正在安装..."
        npm install -g pnpm
    fi
    
    print_success "pnpm 版本：$(pnpm -v)"
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

# 创建 .env 文件（如果不存在）
create_env_file() {
    if [ ! -f .env ]; then
        print_info "创建默认 .env 配置文件..."
        cat > .env << 'EOF'
# PG Query Visualizer 配置文件

# 服务器配置
PORT=3000
HOST=0.0.0.0

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
        print_success ".env 文件已创建，请根据实际情况修改配置"
    else
        print_warning ".env 文件已存在，跳过创建"
    fi
}

# 主函数
main() {
    echo "============================================"
    echo "  PG Query Visualizer - 一键安装脚本"
    echo "============================================"
    echo ""
    
    print_info "开始安装流程..."
    echo ""
    
    # 1. 检查 Node.js
    check_nodejs
    echo ""
    
    # 2. 检查 pnpm
    check_pnpm
    echo ""
    
    # 3. 创建 .env 文件
    create_env_file
    echo ""
    
    # 4. 安装依赖
    install_dependencies
    echo ""
    
    # 5. 构建项目
    build_project
    echo ""
    
    echo "============================================"
    print_success "安装完成！"
    echo "============================================"
    echo ""
    print_info "启动服务请运行：./start.sh"
    print_info "运行测试请运行：./test.sh"
    echo ""
}

# 执行主函数
main
