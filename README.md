<h1 align=center>
  <img src="https://github.com/user-attachments/assets/9d626e0f-0601-4640-8981-ad66d8ac4853" alt="TypeWords" style="width: 500px;"/>
</h1>

<p align="center">
  <b>学习英语，一次敲击，一点进步；记忆不再盲目，学习更高效，开源单词练习工具</b>
</p>

## 项目介绍

<https://www.bilibili.com/video/BV1NBbF6EE8L>

> 本仓库是 [zyronon/TypeWords](https://github.com/zyronon/TypeWords) 的 fork，专注于本地优先的单词打字练习。

## 在线访问

[https://typewords.cc](https://typewords.cc)   

<img width="1920" height="1440" alt="practice words" src="/public/imgs/words.png" />

## 功能列表

### 单词练习

- 练习模式：智能学习 / 自由 / 随机复习 / 复习 / 自测 / 听写 / 默写 / 单词测试 / 自定义流程
- 智能模式：基于 [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) 记忆算法自动计算学习单词，并通过默写加深记忆
- 设置中可关闭智能学习/复习中的默写阶段，适合只需认读的词；独立听写模式与自定义流程不受影响
- 自由模式：不受限制，自行规划
- 自定义流程：可为词库自定义练习阶段顺序（跟写、自测、听写、默写）
- 单词提供音标、发音（美音、英音）、例句、短语、近义词、同根词、词源、错误统计等功能

### 收藏、错词本、已掌握

- 学习单词时输入错误自动添加到错词本，方便后续复习
- 可主动添加到已掌握，后续学习时自动跳过
- 可主动添加到收藏中，以便巩固复习

### 高度自由

- 丰富的键盘音效
- 可自定义快捷键
- 高度定制化的设置选项
- 主题基于 CSS 变量驱动

### 简洁高效

- 简洁设计，现代化UI，无广告
- 界面清爽，操作简单
- 不强制关注任何平台

### 词库

仓库内置 **CET-4**、**雅思词汇真经** 等常用词库。

词库目录（`public/list/word.json`）与词库数据（`public/dicts/en/word/*.json`）都是普通 JSON 文件，新增词库不需要改动代码。也非常欢迎社区贡献更多的词库。

## 数据与隐私

- **本地优先**：所有学习进度保存在浏览器 IndexedDB 中，无需注册账号。
- **可选云同步**：登录后可将进度同步到云端，换设备登录即可继续。
- 官方词库是按需加载的静态文件，**不会**存入 IndexedDB，也**不会**上传云端；只保存单词元数据与你的学习进度。
- 错词、收藏、已掌握按词库分别记录，始终在你自己手里。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | [Nuxt 4](https://nuxt.com) + Vue 3.5 |
| 状态 | [Pinia](https://pinia.vuejs.org) |
| 样式 | [UnoCSS](https://unocss.dev) + SCSS（CSS 变量主题） |
| 记忆算法 | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) |
| 存储 | [idb-keyval](https://github.com/jakearchibald/idb-keyval)（IndexedDB），可选 [Supabase](https://supabase.com) 云同步 |
| 国际化 | [@nuxtjs/i18n](https://i18n.nuxtjs.org)，14 种语言，Excel 工作流 |
| 测试 | [Vitest](https://vitest.dev) |

## 项目结构

```
app/
  pages/
    (words)/               # /words、/dict-list、/dict、/practice-words、/words-test
    setting.vue            # 设置页
    index.vue              # 落地页
  layouts/                 # default（侧栏 + 初始化）/ empty（落地页）
  components/              # 业务组件：word / setting / list / dialog
  base/                    # 自研 UI 组件，不依赖 Element/Ant
  core/
    stores/                # Pinia 状态
    composables/
      practice-words/      # 单词练习引擎：流程配置、键入、会话、缓存恢复
    hooks/                 # dict / fsrs / sound / theme / export
    types/                 # Word / Dict / 枚举
    utils/                 # 加载、升级、资源路径、同步策略
    apis/                  # 查词 HTTP
public/
  dicts/en/word/           # 官方词库（只读 JSON）
  list/                    # 词库目录
  sound/                   # 键盘音效
i18n/                      # i18n.xlsx（源）+ 生成的语言 JSON
tests/                     # Vitest 单元测试
docs/                      # 贡献指南、改造基线等文档
```

## 运行

#### 注：进度保存在本机 IndexedDB。登录可选；登录后可同步到官方云，换设备登录即可继续。

本项目是基于`Nuxt`开发的，需要 node 环境来运行（推荐 Node.js 20+）。

1. 安装 NodeJS，参考[官方文档](https://nodejs.org/en/download)
2. 项目文件很大，推荐使用 `git clone --depth 1 https://github.com/wangbar0133/TypeWords.git` 命令只克隆最近一次提交。直接下载
   Github 提供的 Download ZIP 功能是无法运行的
3. 在项目根目录下，打开命令行，运行`pnpm install`来下载依赖。
4. 执行`pnpm run dev`来启动项目，项目默认地址为[`http://localhost:5567`](http://localhost:5567)
5. 在浏览器中打开[`http://localhost:5567`](http://localhost:5567)  来访问项目。
6. 执行`pnpm run generate`打包项目文件

## 开发

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器，端口 `5567` |
| `pnpm test` | 运行 Vitest 单元测试（改动练习引擎后请运行） |
| `pnpm generate` | 打包静态站点 |
| `pnpm i18n:write` | 编辑 `i18n/i18n.xlsx` 后重新生成语言文件 |
| `./scripts/build-static.sh` | 构建静态镜像并推送到 Docker Hub（详见部署文档） |

### 部署

推荐用 Docker 部署静态镜像（nginx 托管静态产物，约 33MB，无需 Node 运行时）：

```bash
./scripts/build-static.sh              # 构建并推送镜像（读取 .env 烘焙站点配置）
# 服务器上
docker compose pull && docker compose up -d
```

完整流程（域名、HTTPS 证书、nginx 反代、回滚、故障排查）见 [`docs/deploy.md`](docs/deploy.md)。

相关文件：`Dockerfile.static`（静态镜像）、`docker-compose.prod.yml`（服务器编排）、`deploy/nginx-static.conf`（容器内 nginx）、`scripts/build-static.sh`（一键构建推送）。

> 站点域名在构建时烘焙：`.env` 里的 `ORIGIN` 控制 canonical URL，`HOST` 控制 og:url 等元数据，改域名需重新构建。

给贡献者的话：

- 新代码使用标准 `ref` / `computed`，不要扩散 `$ref` / `$computed`。
- 优先使用 `app/assets/css/main.scss` 中的 CSS 变量，不要写死主题色。
- 单词练习逻辑在 `app/core/composables/practice-words/`，调整阶段顺序改 `practice-flow-config.ts`，不要改页面。
- 修改词库/设置/练习缓存的持久化结构时，需要提供升级路径并升级版本号。

## 功能与建议

目前项目处于开发初期，新功能正在持续添加中，如果你对软件有任何功能与建议，欢迎在 `Issues` 中提出
如果你也喜欢本软件的设计思想，欢迎提交 `Pr`，非常感谢你对我们的支持！

## 贡献指南

[贡献准则](/docs/CONTRIBUTING.md)

如果您对本项目感兴趣，我们非常欢迎参与到项目的贡献中，我们会尽可能地提供帮助

在贡献前，我们希望您能与开发者进行沟通，以避免代码冲突

再次感谢您对本项目的贡献！🎉

## 许可证

[GPL-3.0](LICENSE)
