# 轻小说创作台 · Light Novel Studio

> 一句话概念，AI 帮你写出整部轻小说：世界观 → 角色 → 章节大纲 → 逐章正文。
> 支持中文与日文，覆盖日式轻小说题材，多 AI 提供商可选，纯前端、数据留本机。

An AI-powered light-novel writing studio. From a one-line concept, it generates the world, cast, chapter outline, and full chapter text — in Chinese or Japanese, with your choice of AI provider. Fully client-side; your data stays in your browser.

---

## 截图 · Screenshots

| 创作引导 | 写作台 |
|---|---|
| ![创作引导](screenshots/panel-workshop.png) | ![写作台](screenshots/panel-write.png) |

| 世界观 | 角色 |
|---|---|
| ![世界观](screenshots/panel-world.png) | ![角色](screenshots/panel-characters.png) |

![书架](screenshots/shelf.png)

---

## 功能 · Features

- 🎯 **一句话生成全稿**：输入一句概念，AI 依次生成世界观、角色群、章节大纲，并逐章写出正文
- 🌏 **中日双语**：内置中文题材（玄幻/言情/科幻/悬疑/武侠…）与日式轻小说题材（異世界転生 / 悪役令嬢 / 魔法学園 / ラブコメ…）
- 🤖 **多 AI 提供商**：Google Gemini / Anthropic Claude / OpenAI / 任意 OpenAI 兼容接口（DeepSeek、Qwen、本地 Ollama 等）
- 📝 **写作台**：AI 续写 / 角色对话 / 场景生成助手，段首缩进、衬线排版、沉浸模式
- 👤 **角色管理**：外貌、性格表里、动机、角色弧线、关系网
- 🌍 **世界观 / 大纲 / 推敲**：完整的设定面板与一致性、读者体验审查
- 💾 **本地优先**：所有作品存于浏览器 `localStorage`，不经过任何服务器

## 技术栈 · Tech Stack

React 19 · Vite 6 · TypeScript · Tailwind (CDN)。纯前端 SPA，无后端，AI 调用通过浏览器直连各提供商 API。

## 快速开始 · Getting Started

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>，点击右上角 **「AI 接口配置」** 填入你的 API Key 即可开始创作。

生产构建：

```bash
npm run build   # 产物输出到 dist/
```

## AI 配置 · Provider Setup

在「AI 接口配置」中选择提供商并填入 Key：

| 提供商 | Key 获取 | 示例模型 |
|---|---|---|
| Google Gemini | aistudio.google.com/apikey | `gemini-3.5-flash` |
| Anthropic Claude | console.anthropic.com | `claude-sonnet-4-6` |
| OpenAI | platform.openai.com | `gpt-5.5` |
| 自定义（OpenAI 兼容） | 填 Base URL | DeepSeek / Qwen / Ollama 等 |

> Key 仅保存在你本地浏览器，不会上传到任何第三方。

## 项目结构 · Project Layout

```
src/
├── App.tsx           # 主应用：书架 + 编辑器外壳
├── llm.ts            # 多提供商 AI 调用层
├── generation.ts     # 小说生成函数（世界观/角色/大纲/正文/续写/审查）
├── storage.ts        # localStorage 持久层
├── types.ts          # 类型定义
└── components/        # 创作引导 / 世界观 / 角色 / 情节 / 写作台 / 推敲
```

## 许可证 · License

[GPL-3.0](LICENSE)
