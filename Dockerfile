# 基础镜像可通过 --build-arg NODE_IMAGE=... 覆盖（如国内网络用 docker.m.daocloud.io/library/node:22-alpine）
ARG NODE_IMAGE=node:22-alpine

# ---------- 构建阶段 ----------
# Nuxt 4 需要 Node >= 20，用 22 LTS
FROM ${NODE_IMAGE} AS build

# 与本地 pnpm 11 / lockfile 版本保持一致
RUN npm install -g pnpm@11.25.0

WORKDIR /app

# 先只拷贝依赖清单，利用 Docker 层缓存（workspace 文件含 pnpm 11 的 allowBuilds 设置）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 再拷贝源码（.dockerignore 排除了 node_modules/.output/.env 等）
COPY . .

# nuxt build → 产出 .output（自包含的 Nitro Node 服务器，含 /api/tts 路由）
RUN pnpm build

# ---------- 运行阶段 ----------
FROM ${NODE_IMAGE} AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5567 \
    TZ=Asia/Shanghai

WORKDIR /app

# Nitro node-server 产物自带 traced node_modules，直接 node 启动即可
COPY --from=build /app/.output ./.output

EXPOSE 5567

# 健康检查：/ 会 307 到 /words，跟随重定向后应为 200
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5567/words >/dev/null 2>&1 || exit 1

CMD ["node", ".output/server/index.mjs"]
