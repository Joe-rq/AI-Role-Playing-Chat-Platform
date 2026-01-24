#!/bin/bash

# 多模型管理系统 - 功能测试脚本
# 用途：验证所有核心功能是否正常工作

set -e  # 遇到错误立即退出

API_BASE="http://localhost:3000"
FRONTEND_BASE="http://localhost:5173"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 打印函数
print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

print_test() {
    echo -n "Testing: $1 ... "
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_pass() {
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC}"
    echo -e "${RED}  Error: $1${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

# 检查服务是否运行
check_service() {
    local url=$1
    local name=$2

    print_test "$name service is running"
    if curl -s -f "$url" > /dev/null 2>&1; then
        print_pass
        return 0
    else
        print_fail "Service not responding at $url"
        return 1
    fi
}

# 测试API端点
test_api() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4

    print_test "$description"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_pass
        echo "$body"
        return 0
    else
        print_fail "HTTP $http_code - $body"
        return 1
    fi
}

# 主测试流程
main() {
    print_header "多模型管理系统 - 功能测试"
    echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"

    # 1. 检查服务状态
    print_header "1. 服务状态检查"
    check_service "$API_BASE" "Backend" || exit 1
    check_service "$FRONTEND_BASE" "Frontend" || print_warning "Frontend may not be running"

    # 2. 测试模型管理API
    print_header "2. 模型管理API测试"

    # 获取所有模型
    models_response=$(test_api "GET" "/models" "GET /models - 获取所有模型")
    models_count=$(echo "$models_response" | jq '. | length' 2>/dev/null || echo "0")
    echo "  → 找到 $models_count 个模型"

    # 获取已启用的模型
    enabled_response=$(test_api "GET" "/models/enabled" "GET /models/enabled - 获取已启用模型")
    enabled_count=$(echo "$enabled_response" | jq '. | length' 2>/dev/null || echo "0")
    echo "  → 找到 $enabled_count 个已启用模型"

    if [ "$enabled_count" -eq 0 ]; then
        print_warning "没有已启用的模型，角色对话可能无法工作"
    fi

    # 获取第一个模型的详情
    if [ "$models_count" -gt 0 ]; then
        first_model_id=$(echo "$models_response" | jq -r '.[0].id' 2>/dev/null)
        if [ -n "$first_model_id" ] && [ "$first_model_id" != "null" ]; then
            test_api "GET" "/models/$first_model_id" "GET /models/:id - 获取单个模型"
        fi
    fi

    # 3. 测试角色管理API
    print_header "3. 角色管理API测试"

    # 获取所有角色
    characters_response=$(test_api "GET" "/characters" "GET /characters - 获取所有角色")
    characters_count=$(echo "$characters_response" | jq '. | length' 2>/dev/null || echo "0")
    echo "  → 找到 $characters_count 个角色"

    # 检查角色的模型配置
    if [ "$characters_count" -gt 0 ]; then
        print_test "检查角色模型配置"
        invalid_models=0
        for i in $(seq 0 $((characters_count - 1))); do
            char_name=$(echo "$characters_response" | jq -r ".[$i].name" 2>/dev/null)
            char_model=$(echo "$characters_response" | jq -r ".[$i].preferredModel" 2>/dev/null)

            if [ -n "$char_model" ] && [ "$char_model" != "null" ] && [ "$char_model" != "" ]; then
                # 检查该模型是否存在且已启用
                model_exists=$(echo "$enabled_response" | jq -r ".[] | select(.modelId == \"$char_model\") | .modelId" 2>/dev/null)
                if [ -z "$model_exists" ]; then
                    invalid_models=$((invalid_models + 1))
                    echo "    ⚠ 角色 '$char_name' 使用的模型 '$char_model' 未启用或不存在"
                fi
            fi
        done

        if [ "$invalid_models" -eq 0 ]; then
            print_pass
        else
            print_warning "发现 $invalid_models 个角色使用了未启用的模型"
        fi
    fi

    # 4. 测试对话功能
    print_header "4. 对话功能测试"

    if [ "$characters_count" -gt 0 ]; then
        first_char_id=$(echo "$characters_response" | jq -r '.[0].id' 2>/dev/null)
        first_char_name=$(echo "$characters_response" | jq -r '.[0].name' 2>/dev/null)

        print_test "POST /chat/stream - 测试对话功能 (角色: $first_char_name)"

        chat_data="{\"characterId\": $first_char_id, \"message\": \"你好\", \"history\": []}"
        chat_response=$(curl -s -X POST "$API_BASE/chat/stream" \
            -H "Content-Type: application/json" \
            -d "$chat_data" \
            --max-time 10 2>&1 | head -5)

        if echo "$chat_response" | grep -q "data:"; then
            print_pass
            echo "  → 收到流式响应"
        else
            print_fail "未收到有效的流式响应"
            echo "  Response: $chat_response"
        fi
    else
        print_warning "没有角色可供测试对话功能"
    fi

    # 5. 测试会话管理API
    print_header "5. 会话管理API测试"

    test_api "GET" "/chat/sessions?page=1&limit=10" "GET /chat/sessions - 获取会话列表"

    # 6. 数据完整性检查
    print_header "6. 数据完整性检查"

    # 检查API Key加密
    print_test "API Key加密检查"
    api_keys_masked=true
    for i in $(seq 0 $((models_count - 1))); do
        api_key=$(echo "$models_response" | jq -r ".[$i].apiKeyMasked" 2>/dev/null)
        if [[ ! "$api_key" =~ \*\*\* ]]; then
            api_keys_masked=false
            break
        fi
    done

    if [ "$api_keys_masked" = true ]; then
        print_pass
        echo "  → 所有API Key已正确脱敏"
    else
        print_fail "发现未脱敏的API Key"
    fi

    # 检查环境变量
    print_test "环境变量检查"
    if [ -f "backend/.env" ]; then
        if grep -q "ENCRYPTION_KEY=" backend/.env; then
            print_pass
            echo "  → ENCRYPTION_KEY已配置"
        else
            print_fail "ENCRYPTION_KEY未配置"
        fi
    else
        print_fail "backend/.env文件不存在"
    fi

    # 7. 性能测试
    print_header "7. 性能测试"

    print_test "API响应时间测试"
    start_time=$(date +%s%N)
    curl -s "$API_BASE/models" > /dev/null
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))

    if [ "$response_time" -lt 1000 ]; then
        print_pass
        echo "  → 响应时间: ${response_time}ms"
    else
        print_warning "响应时间较慢: ${response_time}ms"
    fi

    # 8. 测试总结
    print_header "测试总结"
    echo "总测试数: $TOTAL_TESTS"
    echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
    echo -e "${RED}失败: $FAILED_TESTS${NC}"
    echo ""

    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}✓ 所有测试通过！系统运行正常。${NC}"
        exit 0
    else
        echo -e "${RED}✗ 有 $FAILED_TESTS 个测试失败，请检查系统状态。${NC}"
        exit 1
    fi
}

# 运行测试
main
