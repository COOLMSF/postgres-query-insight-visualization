#!/bin/bash

# ============================================
# PG Query Visualizer - 一键测试脚本
# ============================================
# 此脚本将自动运行所有测试

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
    echo -e "${GREEN}[通过]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[失败]${NC} $1"
}

# 检查依赖是否已安装
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_error "未检测到 node_modules，请先运行 ./install.sh"
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

# 运行代码格式化检查
run_format_check() {
    print_info "正在检查代码格式..."
    if pnpm prettier --check .; then
        print_success "代码格式检查通过"
    else
        print_warning "代码格式需要修复，运行 './start.sh format' 自动修复"
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

# 运行构建测试
run_build_test() {
    print_info "正在测试构建流程..."
    if pnpm build; then
        print_success "构建成功"
    else
        print_error "构建失败"
        return 1
    fi
}

# 显示使用说明
show_usage() {
    echo "用法：./test.sh [选项]"
    echo ""
    echo "选项:"
    echo "  all       运行所有检查（默认）"
    echo "  type      只运行类型检查"
    echo "  format    只运行格式检查"
    echo "  unit      只运行单元测试"
    echo "  build     只运行构建测试"
    echo "  -h, help  显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./test.sh         # 运行所有检查"
    echo "  ./test.sh all     # 运行所有检查"
    echo "  ./test.sh type    # 只运行类型检查"
    echo "  ./test.sh unit    # 只运行单元测试"
    echo ""
}

# 主函数
main() {
    echo "============================================"
    echo "  PG Query Visualizer - 测试脚本"
    echo "============================================"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 记录失败状态
    FAILED=0
    
    # 解析参数
    case "${1:-all}" in
        all)
            print_info "运行完整测试套件..."
            echo ""
            
            run_type_check || FAILED=1
            echo ""
            
            run_format_check || FAILED=1
            echo ""
            
            run_tests || FAILED=1
            echo ""
            
            run_build_test || FAILED=1
            echo ""
            ;;
        type)
            run_type_check || FAILED=1
            ;;
        format)
            run_format_check || FAILED=1
            ;;
        unit)
            run_tests || FAILED=1
            ;;
        build)
            run_build_test || FAILED=1
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "未知选项：$1"
            show_usage
            exit 1
            ;;
    esac
    
    # 显示最终结果
    echo "============================================"
    if [ $FAILED -eq 0 ]; then
        print_success "所有测试通过！"
    else
        print_error "部分测试失败，请检查上方输出"
        exit 1
    fi
    echo "============================================"
}

# 执行主函数
main
