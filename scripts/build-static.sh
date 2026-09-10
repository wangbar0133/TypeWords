#!/usr/bin/env bash
#
# TypeWords 静态镜像：本地构建 + 推送 Docker Hub
#
# 用法：
#   ./scripts/build-static.sh                       # 构建并推送 :static
#   TAG=v1.2.0 ./scripts/build-static.sh            # 指定版本标签（便于回滚）
#   PUSH=false ./scripts/build-static.sh            # 只本地构建，不推送
#   PLATFORM=linux/amd64,linux/arm64 ./scripts/build-static.sh   # 多架构
#
# 产物来源：pnpm generate 读取项目根目录 .env，把 Supabase 等公开配置
# 烘焙进 _nuxt/*.js，因此换配置需要重新执行本脚本。
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-wangbar01334/typewords}"
TAG="${TAG:-static}"
PLATFORM="${PLATFORM:-linux/amd64}"
PUSH="${PUSH:-true}"
# 拉不动 Docker Hub 时用国内镜像源，例如（留空则直接用官方 nginx:alpine）：
#   BASE_IMAGE=docker.m.daocloud.io/library/nginx:alpine ./scripts/build-static.sh
BASE_IMAGE="${BASE_IMAGE:-}"

BUILD_ARGS=()
[[ -n "$BASE_IMAGE" ]] && BUILD_ARGS+=(--build-arg "NGINX_IMAGE=${BASE_IMAGE}")

echo "▶ 1/4 安装依赖"
pnpm install --frozen-lockfile

echo "▶ 2/4 生成静态产物（读取 .env）"
pnpm generate

if [[ ! -f .output/public/200.html ]]; then
  echo "✖ 未找到 .output/public/200.html，generate 结果异常" >&2
  exit 1
fi

# i18n 语言包平时由 Nitro 路由提供，静态托管下必须落成文件，否则界面显示 key 而非文案
echo "▶ 3/4 生成静态语言包"
node scripts/gen-i18n-messages.mjs

if [[ "$PUSH" == "true" ]]; then
  echo "▶ 4/4 构建并推送 ${IMAGE}:${TAG} (${PLATFORM})"
  docker buildx build \
    --platform "$PLATFORM" \
    ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} \
    -f Dockerfile.static \
    -t "${IMAGE}:${TAG}" \
    --push .
  echo
  echo "✅ 已推送 ${IMAGE}:${TAG}"
  echo "   服务器上更新：cd ~/typewords && docker compose pull && docker compose up -d"
else
  echo "▶ 4/4 仅本地构建（不推送）"
  docker buildx build \
    --platform "$PLATFORM" \
    ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} \
    -f Dockerfile.static \
    -t "${IMAGE}:${TAG}" \
    --load .
  echo
  echo "✅ 本地镜像就绪 ${IMAGE}:${TAG}"
  echo "   本地预览（Apple Silicon 上跑 amd64 镜像必须指定 --platform）："
  echo "   docker run --rm -p 8080:80 --platform ${PLATFORM} ${IMAGE}:${TAG}"
fi
