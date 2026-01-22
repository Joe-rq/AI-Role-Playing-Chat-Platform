#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 正在启动 AI 角色扮演对话平台...${NC}"

# 定义退出处理函数，确保脚本结束时关闭所有子进程
cleanup() {
    echo -e "\n${YELLOW}正在关闭服务...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM EXIT

# 检查后端环境
echo -e "${GREEN}📦 正在启动后端 (Backend)...${NC}"
cd backend
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  检测到后端未配置 .env，正在从 .env.example 复制...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}🚨 请务必编辑 backend/.env 文件配置您的 OPENAI_API_KEY！${NC}"
fi

# 在后台启动后端
npm run start:dev &
BACKEND_PID=$!

# 等待几秒让后端先运行起来
sleep 3

# 检查前端环境
echo -e "${GREEN}💻 正在启动前端 (Frontend)...${NC}"
cd ../frontend
# 在后台启动前端
npm run dev &
FRONTEND_PID=$!

echo -e "${BLUE}✨ 服务已启动！${NC}"
echo -e "前端地址: ${GREEN}http://localhost:5173${NC}"
echo -e "后端地址: ${GREEN}http://localhost:3000${NC}"
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"

# 等待所有后台进程
wait
