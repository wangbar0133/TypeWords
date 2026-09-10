# TypeWords 部署指南（静态镜像 + 复用现有 nginx）

## 架构

```
Mac 本地                                 ECS 服务器
──────────                              ──────────────
pnpm generate  → 17MB 静态产物
      ↓
docker buildx --push  ──→ Docker Hub ──→ typewords 容器（内网 :80，不占宿主端口）
                                              ↑ proxy_pass http://typewords:80
                                         现有 img-hub nginx（80/443 + Let's Encrypt）
```

TypeWords 是**本地优先**应用：所有用户数据存在浏览器 IndexedDB，服务端只负责发静态文件。
因此不需要数据库、不需要数据卷、容器可随时重建而不丢数据。

## 相关文件

| 文件 | 用途 |
|---|---|
| `Dockerfile.static` | 静态镜像（nginx + 产物），无 RUN 步骤 → 构建期无需架构模拟 |
| `Dockerfile.static.dockerignore` | 该镜像专属构建上下文（只带 `.output/public` 与 nginx 配置） |
| `deploy/nginx-static.conf` | 容器内 nginx：SPA 兜底到 `200.html` + 缓存策略 |
| `scripts/build-static.sh` | 本地一键构建 + 推送 Docker Hub |
| `scripts/gen-i18n-messages.mjs` | 生成静态语言包（见下方「静态托管两个必知点」） |
| `docker-compose.prod.yml` | 服务器编排：只拉镜像、不映射端口、加入现有网络 |
| `Dockerfile` / `docker-compose.yml` | Node 容器方案（保留 `/api/tts`，本机开发/预览用） |

## 静态托管的两个必知点

这两个坑在 `nuxt generate` 之后才会暴露，页面能打开但功能异常：

**1. i18n 语言包是运行时请求的服务端路由**

`@nuxtjs/i18n` 会请求 `/_i18n/<deploymentHash>/<locale>/messages.json`，该路由平时由 Nitro
提供，`nuxt generate` 不会预渲染它 → 静态托管下必然 404，**界面退化成显示 i18n key 而不是文案**。
其中 `deploymentHash` 由模块内部 `hash(Date.now())` 生成，无法在 `nuxt.config` 里预设。

→ 由 `scripts/gen-i18n-messages.mjs` 在 generate 之后解析产物中的 hash，
按服务端路由的结构写出静态文件。**已集成进 `build-static.sh`，无需手工执行。**

**2. 图片优化端点 `/_ipx/*` 同样是服务端路由**

`@nuxt/image` 默认的 ipx provider 会生成 `/_ipx/_/xxx.svg` 这类请求，静态托管下 404，
空状态图片不显示。项目内只有装饰性静态 SVG，不需要服务端优化。

→ 已在 `nuxt.config.ts` 设为 `image: { provider: 'none' }`（直接输出原始路径）。
附带收益：产物中不再打包 sharp 原生二进制，`.output/server` 从 45MB 降到 11MB，
Node 容器方案也因此不再有架构依赖。

## 前置条件

- 域名已解析到 ECS 公网 IP
- ECS 上已有 img-hub 部署（提供 nginx 与 80/443）
- 本地已登录 Docker Hub：`docker login`

## 站点域名配置（ORIGIN / HOST）

静态产物的域名相关元数据在**构建时烘焙**，改域名需要重新构建：

| 变量 | 作用 |
|---|---|
| `ORIGIN` | `runtimeConfig.public.origin` → `app.vue` 的 canonical URL 等 |
| `HOST` | 注入 `env.ts` 的 `Host` 常量 → `Origin` → about/setting 的 `og:url`、分享文案、迁移提示 |

两者都写在项目根目录 `.env`：

```
ORIGIN=https://words.neicun.online
HOST=words.neicun.online
```

> `Host` 由 `nuxt.config.ts` 的 `vite.define` 注入（`__APP_HOST__`），未注入时（如单元测试）回退到 `typewords.cc`。

## 关于统计脚本

`public/libs/t.js` 原本加载三套统计（51.la、百度统计、Umami），它们的 ID 与上报地址都指向
**上游作者的账号**，自建部署会把访客数据发往第三方，并因域名未注册而持续返回 400。
本仓库已把它们全部关闭，该文件现为占位文件——需要时取消注释并填入自己的 ID 即可。

## 一、本地构建推送

```bash
open -a Docker                                  # 启动 Docker Desktop
cd ~/dev/TypeWords
./scripts/build-static.sh                       # 推送 :static
TAG=v1.2.0 ./scripts/build-static.sh            # 建议：打版本标签，便于回滚
PUSH=false ./scripts/build-static.sh            # 只本地构建，不推送
```

> 脚本会读取项目根目录 `.env`，把 `NUXT_PUBLIC_SUPABASE_*` 等公开配置**烘焙进产物**。
> 换配置（如换 Supabase 项目）需要重新执行本脚本并重新部署。

## 二、服务器首次准备

```bash
# 1. 确认现有网络名（compose 会加项目前缀）
docker network ls | grep img-hub        # 通常为 img-hub_img-hub-network

# 2. 建立部署目录
mkdir -p ~/typewords && cd ~/typewords
# 上传 docker-compose.prod.yml 并重命名为 docker-compose.yml
# 如网络名不同，同目录建 .env 写入：EDGE_NETWORK=实际网络名
```

## 三、接入 nginx（关键步骤，注意顺序）

**1. 先追加 HTTP 配置**（此时不能加 443，证书尚未签发，否则 nginx 启动失败）

在 img-hub 的 `nginx.conf` 追加：

```nginx
server {
    listen 80;
    server_name typewords.cc www.typewords.cc;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$server_name$request_uri; }
}
```

**2. 验证并生效**

```bash
docker exec img-hub-nginx nginx -t
docker exec img-hub-nginx cat /etc/nginx/conf.d/default.conf | tail -20   # 确认改动真的进去了
docker exec img-hub-nginx nginx -s reload
```

> ⚠️ `nginx.conf` 是**单文件挂载**。用编辑器保存（写临时文件再重命名）会换 inode，
> 容器内仍指向旧文件——务必用上面的 `cat` 确认，或改完 `docker restart img-hub-nginx`。

**3. 签发证书**（复用现有 certbot 的 webroot 与证书目录）

```bash
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d typewords.cc -d www.typewords.cc \
  --email 你的邮箱 --agree-tos --no-eff-email --non-interactive
```

**4. 补上 HTTPS 配置**

```nginx
server {
    listen 443 ssl http2;
    server_name typewords.cc www.typewords.cc;

    ssl_certificate         /etc/letsencrypt/live/typewords.cc/fullchain.pem;
    ssl_certificate_key     /etc/letsencrypt/live/typewords.cc/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/typewords.cc/chain.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        # 用变量形式让 nginx 在运行时解析容器名：
        # 若写成 proxy_pass http://typewords:80; 则 typewords 未启动时
        # nginx 会因 "host not found in upstream" 启动失败，连带 img-hub 一起挂
        resolver 127.0.0.11 valid=10s;
        set $typewords_upstream typewords;
        proxy_pass http://$typewords_upstream:80;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

再次 `nginx -t` → 确认生效 → `nginx -s reload`。

**5. 启动容器**

```bash
cd ~/typewords && docker compose up -d && docker compose ps
curl -I https://typewords.cc        # 期望 200
```

## 四、日常发布

```bash
# 本地
TAG=v1.2.1 ./scripts/build-static.sh

# 服务器
cd ~/typewords && docker compose pull && docker compose up -d
```

HTML 不缓存、`_nuxt/` 资源名带 hash，用户刷新即可拿到新版本。

## 五、回滚

```bash
# 服务器 ~/typewords/.env 写入 IMAGE_TAG=v1.2.0，然后
docker compose up -d
```

nginx 配置回滚：恢复备份的 `nginx.conf` 后 `docker restart img-hub-nginx`。

## 六、对现有服务的影响

- TypeWords 容器不映射宿主端口，与 img-hub 无端口冲突
- 加入现有网络是增量操作（`external: true` 不会被 compose 创建/删除）
- 唯一风险面是修改 img-hub 的 nginx 配置，按上述顺序（备份 → `nginx -t` → 确认生效 → reload）操作即可规避
- 证书按域名分目录存放，不影响 `img.neicun.online`

## 七、备选方案

**A. Node 容器（保留 `/api/tts` Fish 例句发音）**

用根目录的 `Dockerfile` / `docker-compose.yml`，nginx 里 `proxy_pass` 改到 `:5567`，
并在 compose 中注入运行时变量（`NUXT_PUBLIC_SUPABASE_URL`、`NUXT_FISH_API_KEY` 等）。
由于 `image.provider = 'none'` 已去掉 sharp，`.output/server` 无原生二进制，
因此也可以在 Mac 上原生 `pnpm build` 后打包成 amd64 镜像（无需 x86 模拟）。
代价：镜像 296MB、内存约 150MB，配置改在运行时（不必重新构建）。

**B. 完全不用镜像**

静态文件不需要运行时，可以直接同步到服务器由现有 nginx 托管：

```bash
pnpm generate
rsync -avz --delete .output/public/ ecs:/var/www/typewords/
```

nginx 侧用 `root /var/www/typewords;` + `try_files $uri $uri/ /200.html;`。
代价：失去镜像版本化与一键回滚。

## 八、故障排查

| 现象 | 排查方向 |
|---|---|
| 页面 404 / 刷新白屏 | nginx 是否配了 `try_files ... /200.html`（SPA 兜底） |
| 界面显示 i18n key 而非文案 | 语言包静态文件是否生成（`build-static.sh` 的第 3 步），产物中应有 `.output/public/_i18n/<hash>/` |
| 本机拉取报 `no matching manifest for linux/arm64` | 镜像是纯 amd64（ECS 用），Apple Silicon 上需加 `--platform linux/amd64` 拉取/运行 |
| 空状态图片不显示、`/_ipx/*` 404 | `nuxt.config.ts` 的 `image.provider` 是否为 `none` |
| 改 nginx 配置不生效 | 单文件挂载 inode 问题，用 `docker exec ... cat` 确认 |
| nginx 启动失败，img-hub 也挂了 | `proxy_pass` 用了容器名导致 upstream 解析失败，改用 `resolver` + 变量写法 |
| 登录/同步失效 | 构建时的 `.env` 是否含有正确的 Supabase 配置，产物里的 `_nuxt/*.js` 应包含项目 URL |
| 例句发音无声 | 静态部署无 `/api/tts`，会回落到有道/浏览器 TTS；如需 Fish 请用 Node 容器方案 |
