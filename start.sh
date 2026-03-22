#!/bin/bash

# ============================================
# PG Query Visualizer - 一键启动脚本
# ============================================
# 此脚本将自动启动开发或生产环境服务

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

# 检查 .env 文件
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env 文件不存在，创建默认配置..."
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
EOF
        print_success ".env 文件已创建"
    fi
}

# 检查依赖是否已安装
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_error "未检测到 node_modules，请先运行 ./install.sh"
        exit 1
    fi
}

# 启动开发环境
start_dev() {
    print_info "正在启动开发环境..."
    print_info "访问地址：http://localhost:3000"
    echo ""
    pnpm dev
}

# 启动生产环境
start_prod() {
    print_info "正在启动生产环境..."
    
    # 检查是否已构建
    if [ ! -d "dist" ]; then
        print_warning "未检测到构建文件，正在构建..."
        pnpm build
    fi
    
    print_info "访问地址：http://localhost:3000"
    echo ""
    pnpm start
}

# 显示使用说明
show_usage() {
    echo "用法：./start.sh [选项]"
    echo ""
    echo "选项:"
    echo "  dev       启动开发环境 (默认)"
    echo "  prod      启动生产环境"
    echo "  -h, help  显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./start.sh          # 启动开发环境"
    echo "  ./start.sh dev      # 启动开发环境"
    echo "  ./start.sh prod     # 启动生产环境"
    echo ""
}

# 主函数
main() {
    echo "============================================"
    echo "  PG Query Visualizer - 启动脚本"
    echo "============================================"
    echo ""
    
    # 检查
    check_env_file
    check_dependencies
    
    # 解析参数
    case "${1:-dev}" in
        dev)
            start_dev
            ;;
        prod)
            start_prod
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            print_error "未知选项：$1"
            show_usage
            exit 1
            ;;
    esac
}

# 执行主函数
main
