# AlexYang 个人博客

一个零依赖的静态博客。没有构建步骤，没有框架，没有第三方库。

```
blog/
├── index.html          文章列表（首页）
├── post.html           单篇文章页，通过 post.html?p=文章标识 访问
├── about.html          关于
├── 404.html            找不到页面
├── posts.json          ← 文章清单
├── posts/              ← 文章正文（Markdown）
│   ├── hello.md
│   ├── srv-record.md
│   └── minecraft-server.md
├── assets/
│   ├── style.css       设计系统（配色、字阶、间距、深色模式、响应式）
│   └── app.js          Markdown 解析 + 渲染 + 各状态处理
├── CNAME               GitHub Pages 的自定义域名
├── .nojekyll           关掉 GitHub 的 Jekyll 处理
└── 预览.bat            本地预览（需 Python）
```

## 写一篇新文章

两步。

**第一步**，在 `posts/` 里新建一个 `.md` 文件，文件名就是文章标识，比如 `posts/my-first-trip.md`。

正文用 Markdown 写。支持标题、加粗、斜体、链接、图片、引用、代码块、行内代码、有序/无序列表、表格、分隔线。

**第二步**，在 `posts.json` 里加一条记录：

```json
{
  "slug": "my-first-trip",
  "title": "文章标题",
  "date": "2026-09-21",
  "tags": ["随笔"],
  "summary": "一句话摘要，会显示在列表页。"
}
```

`slug` 必须和 `.md` 文件名一致（不含 `.md`）。列表按 `date` 倒序自动排。

保存，刷新，完成。

## 本地预览

双击 **`预览.bat`**，浏览器会自动打开 `http://localhost:8080/`。

> 为什么要用脚本而不是直接双击 `index.html`？
> 因为文章是浏览器运行时读取 `.md` 文件渲染的，而浏览器出于安全策略**禁止从 `file://` 读取文件**。
> 所以本地看必须走一个小服务器。脚本关闭后就停止。

## 部署

这个站点已经配置好 GitHub Pages：

1. 推到 GitHub 仓库
2. 仓库 **Settings → Pages**，Source 选 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`
3. 在 **Custom domain** 填 `alexyang.top`，保存
4. DNS 那边按下面配好之后，勾选 **Enforce HTTPS**

### DNS 记录

在 GoDaddy 的 DNS 面板里：

| 类型 | 名称 | 值 |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `你的用户名.github.io` |

> ⚠️ 配之前记得先删掉 GoDaddy 默认的域名停放 A 记录，否则会和上面四条冲突。

### 不想用 GitHub Pages

整套东西是纯静态的，放哪都能跑：Netlify、Cloudflare Pages、Vercel，或者自己的服务器。
只要保证 `posts.json` 和 `posts/` 能通过 HTTP 访问就行。

## 设计说明

- **配色**：暖纸底 + 印章红。中性色向强调色做了轻微偏移，表面才有温度。
- **字体**：全部走系统字体。中文不加载 Web 字体（Google Fonts 在国内不可达，中文字体本身也动辄 5-10MB）。
- **排版**：正文行宽限制在 34rem，落在 60-76 字符的舒适区。字阶相邻级差 ≥1.3。
- **动效**：只在列表入场时用一次，且尊重 `prefers-reduced-motion`。
- **无障碍**：跳转链接、可见焦点环、语义化标签、44px 触控目标、深色模式跟随系统。
