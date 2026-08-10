# llmwiki

[![CI](https://img.shields.io/github/actions/workflow/status/atomicstrata/llm-wiki-compiler/ci.yml?branch=main&logo=github&label=CI)](https://github.com/atomicstrata/llm-wiki-compiler/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/llm-wiki-compiler?logo=npm&label=npm)](https://www.npmjs.com/package/llm-wiki-compiler)
[![docs](https://img.shields.io/badge/docs-llmwiki.atomicstrata.ai-blue)](https://llmwiki.atomicstrata.ai)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> **1.0 新增：** 可配置生命周期配置文件（Configurable Lifecycle Profiles, CLP）让 llmwiki 成为可复用的领域知识底座。你可以在一个经过校验的配置文件中声明类型化实体、关系、生命周期门禁、工作流、工件、连接器和检索策略。可以直接从内置的 `autosci` 科研模板、风格明显不同的 `newsroom` 编辑模板开始，或安装本地声明式模板。

---

## llmwiki 是做什么的

llmwiki 会把原始资料编译成一个相互链接、可追溯引用的 Markdown Wiki，供 Agent 和人类浏览、查询、校验、导出和复用。默认配置保留经典的 concepts-and-queries 布局；可选配置文件则能在不为编译器增加领域分支的前提下，引入特定领域的类型和工作流。

llmwiki 实现了 [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 模式：不是在每次查询时都从原始文件里重新发现知识，而是先把知识编译成可长期积累的页面，让结构、来源、评审状态和检索元数据随着时间沉淀下来。

![llmwiki demo](docs/images/demo.gif)

## 什么时候适合使用这个仓库

当你需要从原始资料构建一个可持久维护的知识库时，llmwiki 很合适：

- 将论文、笔记、README、对话转录、PDF、图片或网页编译成类型化 Wiki 页面。
- 给 Agent 提供稳定、带引用感知的上下文包，而不是一堆松散文件。
- 通过源引用、评审队列、新鲜度检查和质量门禁，让生成知识可审计。
- 可以在本地浏览结果、用 CLI 查询、通过 MCP 暴露，或通过 SDK 嵌入其它系统。
- 使用 Open Knowledge Format（OKF）、JSON、JSON-LD、GraphML、Marp 和 `llms.txt` 与其它工具交换已编译知识。

不建议把 llmwiki 用作通用静态站点生成器、重量级本体数据库，或替代对高速变化原始日志的临时搜索。它最适合那些值得编译、评审和复用的知识。

## 你能得到什么

- **不是 chunks，而是编译后的 wiki。** 两阶段 LLM 流水线先抽取概念，再生成类型化页面：`concept`、`entity`、`comparison` 和 `overview`。
- **可配置生命周期配置文件。** 一个 fail-closed 的 `.llmwiki/profile.json` 可以声明实体 schema、类型化关系、生命周期状态机、状态迁移要求、工作流、工件、连接器、内容分层和检索策略。
- **可安装的领域模板。** `llmwiki template init autosci` 会创建一个科研项目，内含论文、想法、实验、手稿、证据工件、工作流和 Crossref 导入。`newsroom` 则展示同一套机制如何用于编辑工作。
- **运行时信任门禁。** 关系、证据、工件以及人类或 Agent 门禁由写入路径强制执行，而不是只靠 prompt 约定；持续 lint 还能在事后发现漂移。
- **可追溯引用的输出。** 段落和结论都带有源文件与行号范围引用，`llmwiki lint` 会校验这些链接。
- **混合检索。** 语义 chunk 搜索、BM25 重排和 wikilink 图扩展协同工作，为查询和 Agent 构建紧凑的证据包。
- **本地查看器。** `llmwiki view` 会打开一个只读浏览器界面，提供搜索、页面元数据、图谱探索、源新鲜度徽标和引用标签。
- **评审策略。** 当置信度、冲突、schema 或来源规则触发时，生成页面可以自动进入待评审状态。
- **新鲜度修复。** `llmwiki lint` 和 `llmwiki next` 会找出过期或孤立页面；`llmwiki refresh --stale` 可以在不重新编译无关新源的情况下修复已变更知识。
- **评测框架。** `llmwiki eval` 会报告健康分、逐页健康分布、wikilink 图健康度、引用覆盖率与精度、语料统计、回归差异，以及可选的裁判模型引用支持。
- **MCP 服务器。** `llmwiki serve` 会向兼容 MCP 的 Agent 暴露 ingest、compile、query、lint、read、status、eval、context-pack 和 OKF 交换工具。
- **SDK。** `createWiki({ root })` 让 TypeScript 直接驱动 ingest、compile、query、context、status、export、eval 和 OKF 导入导出，无需 shell 调用。
- **Open Knowledge Format 交换。** 支持导出和导入 OKF bundle，用于可移植、原生 Markdown 的知识交换。外部 OKF 默认进入评审队列；显式信任的 bundle 才会直接写入。
- **其他可移植导出。** 可导出为 JSON、JSON-LD、GraphML、Marp 幻灯片和 `llms.txt`，供下游系统使用。
- **Provider 可移植。** 支持 Anthropic、Claude Agent SDK 本地登录、兼容 OpenAI 的服务、Ollama、GitHub Copilot 和本地 OpenAI 兼容运行时。

## 可配置生命周期配置文件（CLP）

CLP 让 llmwiki 的知识编译器成为可复用的领域知识系统底座。一个经过校验的 `.llmwiki/profile.json` 是以下内容的统一契约：

- 类型化实体、字段和有向关系；
- 生命周期状态、状态迁移证据和信任门禁；
- 多阶段工作流和声明式动作；
- 哈希固定的工件和一方连接器绑定；
- 内容层级与检索行为。

这些规则由运行时强制执行，而不是停留在 prompt 约定层。CLI、SDK、MCP 服务器、viewer、context builder、lint、status、export 和 OKF 交换，都会基于同一份 profile 契约工作。无效 profile 或绕过声明门禁的写入都会直接失败。

CLP 在设计上向后兼容：如果项目中没有 `.llmwiki/profile.json`，就会使用内置默认的 concepts-and-queries profile，并保持 1.0 之前的行为。你可以通过三种方式开始：自己搭一个 profile、安装内置或本地模板，或从受信任 tap 安装已签名模板：

```bash
# 逐个实体类型搭建自己的 profile
llmwiki profile init research --entity paper

# 或安装内置 / 本地声明式模板
llmwiki template list
llmwiki template inspect autosci
llmwiki template init autosci

llmwiki profile validate
llmwiki workflow list
```

`autosci` 是一个实用的科研系统，包含论文、想法、实验、手稿、证据工件、工作流和 Crossref 数据摄取。`newsroom` 则把同样的通用机制应用在文章、desk、署名和编辑工作流上。模板只包含配置和示例，不包含可执行插件代码。

模板也可以被安全分发。发布者可以用 `llmwiki template publish` 构建带签名的离线分发包，支持 Ed25519 签名、密钥轮换和包撤销，并通过 `template publish verify` 进行校验。使用方可以添加显式信任的 tap，发现和检查带签名目录，并在连续性、撤销和兼容性检查的保护下安装或更新模板。

可以阅读 [CLP 概念指南](docs/concepts/configurable-lifecycle-profiles.mdx)、[AutoSci 科研工作流](docs/guides/autosci-research-workflow.mdx) 或 [Newsroom 编辑工作流](docs/guides/newsroom-editorial-workflow.mdx)。

## Karpathy 的 LLM Wiki 模式

Andrej Karpathy 将 LLM Wiki 模式描述为一种把原始资料转成可供后续 Agent 复用的已编译知识的方法。llmwiki 就是这一模式的具体编译器实现。

关键变化在于把工作从查询时转移到编译时。传统 RAG 会不断从原始 chunk 中检索内容，并在每个问题上重新让模型恢复关系。llmwiki 则先把来源转成带引用、元数据和评审状态的类型化互链页面；后续查询、上下文包、导出和 MCP 工具都围绕这份已编译产物进行。

因此当知识需要持续沉淀时，llmwiki 就很有价值：跨来源共享的概念会收敛为一个页面，过去的答案会成为未来的上下文，过期页面可以被检测和修复，而 Agent 拿到的是稳定证据包，不需要从头再读一遍原始资料。

更深入的说明见 [`docs/concepts/karpathy-pattern.mdx`](docs/concepts/karpathy-pattern.mdx)。

## Agent 决策指南

如果某个 Agent 正在读这个 README，下面这些入口最值得优先关注：

| 目标 | 用法 |
|---|---|
| 从单个来源创建 wiki 并查看结果 | `llmwiki quickstart <source>` |
| 启动一个类型化科研或编辑项目 | `llmwiki template list`，然后 `llmwiki template init autosci\|newsroom` |
| 查看或校验当前领域契约 | `llmwiki profile show` 和 `llmwiki profile validate` |
| 运行已声明的生命周期工作流 | `llmwiki workflow list`，然后 `llmwiki workflow start <id>` |
| 写入或校验 profile 中声明的工件 | `llmwiki artifact write ...` 和 `llmwiki artifact verify <ref>` |
| 通过连接器导入外部记录 | `llmwiki connector list`，然后 `llmwiki connector run <id> --input key=value` |
| 增加更多文件或 URL | `llmwiki ingest <url-or-file>` |
| 编译或重新编译变更来源 | `llmwiki compile` |
| 将生成页面挂起等待人工审批 | `llmwiki compile --review` 或配置评审策略 |
| 提出有依据的问题 | `llmwiki query "question"` |
| 把答案保存回 wiki | `llmwiki query "question" --save` |
| 为另一个 Agent 构建证据包 | `llmwiki context "<task>" --json` 或 MCP `get_context_pack` |
| 查看已编译知识库 | `llmwiki view --open` |
| 检查坏链、引用、置信度、新鲜度和质量 | `llmwiki lint` 和 `llmwiki eval` |
| 修复过期编译页面 | `llmwiki refresh --stale --dry-run`，然后 `llmwiki refresh --stale` |
| 让 Agent 驱动 llmwiki | `llmwiki serve --root <project>` |
| 在 TypeScript 中驱动 llmwiki | `createWiki({ root })` |
| 导出给其它系统使用 | `llmwiki export --target <format>` |
| 导出 Open Knowledge Format bundle | `llmwiki export --target okf --out <dir>` |
| 导入 Open Knowledge Format bundle | `llmwiki import --okf <dir> --dry-run`，然后评审 / 批准 |

## 快速开始

```bash
npm install -g llm-wiki-compiler

export ANTHROPIC_API_KEY=sk-...
# 或切换到其他 provider：
# export LLMWIKI_PROVIDER=openai
# export OPENAI_API_KEY=sk-...

llmwiki quickstart ./notes.md
llmwiki query "what are the key ideas?"
llmwiki view --open
```

`quickstart` 会导入一个来源、编译页面并打开 viewer。在已有项目里，如果你想知道下一步最稳妥的操作，可以运行 `llmwiki next`。

如果你想从领域模型开始，而不是默认的 concepts-and-queries 布局：

```bash
mkdir research-wiki && cd research-wiki
llmwiki template inspect autosci
llmwiki template init autosci
llmwiki profile validate
llmwiki workflow list
```

模板安装用于新的或空的类型化项目。它会把所选 profile 物化到 `.llmwiki/profile.json` 中；正常项目加载不依赖模板注册表或 lockfile。

## 演示

你可以直接拿任意文章或文档试试：

```bash
mkdir my-wiki && cd my-wiki
llmwiki quickstart https://en.wikipedia.org/wiki/Andrej_Karpathy
llmwiki query "What terms did Andrej coin?"
```

[`examples/basic/`](examples/basic/) 目录里包含一个预生成的小型 wiki，就算没有 API Key 也可以直接查看。

## 核心命令

| 命令 | 作用 |
|---|---|
| `llmwiki ingest <url-or-file>` | 拉取 URL 或复制本地文件到 `sources/`。 |
| `llmwiki ingest-session <path>` | 将 Claude、Codex 或 Cursor 导出的会话导入 `sources/`。 |
| `llmwiki quickstart <source>` | 一步完成导入、编译，并可选择打开 viewer。 |
| `llmwiki compile` | 增量抽取概念并生成 wiki 页面。 |
| `llmwiki refresh --stale [--dry-run]` | 重新编译已过期页面对应的变更 owner，并清理选中的孤立 ownership。 |
| `llmwiki template list\|inspect\|init` | 发现并安装经过校验的声明式 profile 模板。 |
| `llmwiki profile init\|show\|validate\|diff` | 创建最小 profile、查看、校验，或评估 profile 变化。 |
| `llmwiki workflow ...` | 发现并驱动 profile 声明的工作流、阶段、门禁和输出。 |
| `llmwiki artifact write\|verify` | 写入受信任的 profile 声明工件，并校验哈希固定引用。 |
| `llmwiki connector list\|run` | 发现一方连接器，并把外部记录以待评审方式导入。 |
| `llmwiki review list/show/approve/reject` | 查看和管理挂起候选项。 |
| `llmwiki query "question" [--save]` | 基于已编译 wiki 提问，并可选择保存答案。 |
| `llmwiki context "<prompt>" --json` | 为 Agent 构建带引用感知的证据包。 |
| `llmwiki view [--open]` | 启动只读本地浏览器查看器。 |
| `llmwiki status [--json]` | 报告页面 / 来源数量、过期和孤立页面、待处理工作及状态健康度。 |
| `llmwiki lint` | 校验 wiki 结构、引用、链接、元数据和新鲜度。 |
| `llmwiki eval [--suite fast\|full]` | 衡量 wiki 质量，以及可选的引用支持情况。 |
| `llmwiki export --target <format>` | 将 wiki 导出为多种可移植格式，包括 Open Knowledge Format（`okf`）。 |
| `llmwiki import --okf <dir> [--dry-run] [--trusted]` | 导入 Open Knowledge Format bundle，默认进入评审流程。 |
| `llmwiki serve --root <dir>` | 启动 MCP 服务器。 |

完整命令文档见 [`docs/cli/`](docs/cli/)。

## Open Knowledge Format

llmwiki 同时是 Open Knowledge Format（OKF）的生产者和消费者。OKF 是 Google Cloud 发起的一个方案，用来用带结构化 frontmatter 的可移植 Markdown 文件共享已编译知识。

```bash
llmwiki export --target okf --out ./dist/okf
llmwiki import --okf ./dist/okf --dry-run
llmwiki import --okf ./dist/okf
```

OKF 导入刻意采用 review-first 设计：不受信任的 bundle 不会直接成为线上 wiki 页面，而是进入评审候选。导入器会保留外部 OKF 元数据，将 llmwiki 来源信息存入 `x-llmwiki`，并在本地编辑后以诚实方式重新导出，包括安全保留原始嵌套路径。

详见 [`docs/guides/open-knowledge-format.mdx`](docs/guides/open-knowledge-format.mdx)、[`docs/cli/export.mdx`](docs/cli/export.mdx) 和 [`docs/cli/import.mdx`](docs/cli/import.mdx)。

## llmwiki 会生成什么

一个项目包含 `sources/` 中的原始输入、`wiki/` 中的已编译 Markdown，以及 `.llmwiki/` 下的编译器状态：

```text
sources/
  raw source files
wiki/
  concepts/      compiled pages
  queries/       saved answers
  <entity>/      profile-declared typed pages
  graph/         typed relation and audit-event stores
  outputs/       derived workflow projections
  index.md       generated TOC
.llmwiki/
  profile.json   active domain contract
  template-lock.json  advisory install provenance
  config.json    review policy
  schema.json    page-kind/cross-link policy
  state.json     source hashes and ownership
  candidates/    held review candidates
  workflows/     signed workflow run state
  eval/          quality history and thresholds
artifacts/       hash-pinned profile-declared files and manifests
log.md           activity journal
```

已编译页面本质上就是带 YAML frontmatter 的纯 Markdown，并额外携带足够元数据，供 Agent 推理引用、新鲜度、置信度、冲突和评审状态。详见 [`docs/concepts/wiki-model.mdx`](docs/concepts/wiki-model.mdx)。

## Agent 集成

### MCP

运行：

```bash
llmwiki serve --root /path/to/wiki-project
```

MCP 客户端可以导入来源、编译、查询、搜索页面、读取页面、lint、执行 eval、查看状态、请求上下文包以及交换 OKF bundle。只读工具不需要 provider 凭证；依赖 LLM 的工具会在调用时校验 provider 凭证。`run_eval` 工具的 fast suite 不需要 provider；full suite 需要 provider，因为它会用 LLM 作为裁判来判断引用支持。

详见 [`docs/guides/mcp-agent-integration.mdx`](docs/guides/mcp-agent-integration.mdx)。

### SDK

```ts
import { createWiki } from "llm-wiki-compiler";

const wiki = createWiki({ root: "/path/to/wiki-project" });
await wiki.ingest({ source: "./notes.md" });
await wiki.compile();
const answer = await wiki.query({ question: "What changed?" });
```

详见 [`docs/guides/sdk.mdx`](docs/guides/sdk.mdx)。

## 配置

最低要求：Node.js 24 或更高版本。

默认 provider 是 Anthropic：

```bash
export ANTHROPIC_API_KEY=sk-...
```

Provider 选择由环境变量驱动：

| Provider | 常见配置 |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN` |
| Claude Agent SDK | 本地 Claude Code 登录，`LLMWIKI_PROVIDER=claude-agent` |
| OpenAI-compatible | `LLMWIKI_PROVIDER=openai`、`OPENAI_API_KEY`，可选 `OPENAI_BASE_URL` |
| Ollama | `LLMWIKI_PROVIDER=ollama`、`OLLAMA_HOST` |
| GitHub Copilot | `LLMWIKI_PROVIDER=copilot`、`GITHUB_TOKEN=$(gh auth token)` |

详见 [`docs/configuration/providers.mdx`](docs/configuration/providers.mdx) 和 [`docs/configuration/environment-variables.mdx`](docs/configuration/environment-variables.mdx)。

## 质量与安全模型

llmwiki 的设计目标之一，就是让生成知识具备可审计性：

- **先评审，再写入。** 使用 `compile --review` 或 `.llmwiki/config.json` 中的评审策略，把高风险页面挂起为候选项。
- **Profile 下限是运行时检查。** 字段契约、生命周期迁移、关系数量、证据和工件要求会在页面、生命周期、工作流、导入和审批写入面统一强制执行。
- **外部连接器数据默认不可信。** 一方连接器使用受限抓取，并把结果作为围栏候选项进入评审；审批会绑定到操作者实际评审过的精确内容。
- **工件是内容寻址的证据。** 工件读写都受路径约束、大小限制、schema 校验，并会核对哈希固定引用。
- **Fail-closed 配置。** 无效的评审策略配置会直接中止编译，而不是悄悄禁用评审。
- **来源范围受限。** 源片段以及导入导出路径都被限制在项目范围内。
- **新鲜度是显式状态。** 页面可以是 fresh、stale、orphaned 或 unverified；过期页面会被标记，并可修复。JSON 导出只包含活跃页面：会携带 live page 的新鲜度（`fresh` / `stale` / `unverified`）；计算得到的 orphaned page 只在 lint 和 viewer 中提示，不进入导出。
- **导入的已编译知识默认进入暂存。** 外部 bundle 除非显式信任，否则都要走评审队列。
- **支持 CI 门禁。** `llmwiki lint` 和 `llmwiki eval` 可以用来强制质量阈值。

详见 [`docs/configuration/review-policy.mdx`](docs/configuration/review-policy.mdx)、[`docs/troubleshooting/stale-pages.mdx`](docs/troubleshooting/stale-pages.mdx) 和 [`docs/guides/ci-quality-gates.mdx`](docs/guides/ci-quality-gates.mdx)。

## 规模表现与适用范围

llmwiki 还处于早期阶段，但已经不是只能处理少量笔记的玩具流水线了。

- **增量编译** 让未变化来源不会重新流过 LLM。
- **并行编译** 会在可配置上限内并发执行概念抽取和页面生成（`--concurrency` / `LLMWIKI_COMPILE_CONCURRENCY`），在大型编译场景下明显减少总耗时。
- **基于 chunk 的嵌入** 先在大型 wiki 中缩小范围，再做 BM25 重排和图扩展。
- **感知内容哈希的 embedding 更新** 避免为未变化页面和 chunk 重算向量。
- **批量 embedding** 让页面和 chunk 向量按批次发送给 provider，而不是逐个请求，从而降低冷启动和大规模刷新时的延迟。
- **缓存引用判断** 让重复执行 `eval --suite full` 的成本更低。
- **词法回退** 保证当当前 provider 没有 embedding endpoint 时，query/context 工作流仍可用。
- **Prompt 预算和 ingest 截断元数据** 会明确标识大来源，而不是假装它们都能完整塞进上下文。

当前最适合的场景，是构建一个可长期维护的项目或领域 wiki：科研资料夹、代码库文档、团队手册、标准规范、设计笔记、决策日志或精心整理的来源集合。不太适合的是高频变化的信息洪流，因为那类场景下原始搜索往往已经够用，编译结构可能比评审速度更快地过期。

## 文档

完整文档站点源码位于 [`docs/`](docs/)：

- 从这里开始：[`docs/introduction.mdx`](docs/introduction.mdx)
- 快速开始：[`docs/quickstart.mdx`](docs/quickstart.mdx)
- 安装：[`docs/installation.mdx`](docs/installation.mdx)
- Karpathy 的 LLM Wiki 模式：[`docs/concepts/karpathy-pattern.mdx`](docs/concepts/karpathy-pattern.mdx)
- 编译器如何工作：[`docs/concepts/how-it-works.mdx`](docs/concepts/how-it-works.mdx)
- Wiki 模型：[`docs/concepts/wiki-model.mdx`](docs/concepts/wiki-model.mdx)
- 可配置生命周期配置文件：[`docs/concepts/configurable-lifecycle-profiles.mdx`](docs/concepts/configurable-lifecycle-profiles.mdx)
- AutoSci 科研工作流：[`docs/guides/autosci-research-workflow.mdx`](docs/guides/autosci-research-workflow.mdx)
- Newsroom 编辑工作流：[`docs/guides/newsroom-editorial-workflow.mdx`](docs/guides/newsroom-editorial-workflow.mdx)
- Profile 模板：[`docs/configuration/profile-templates.mdx`](docs/configuration/profile-templates.mdx)
- CLI 参考：[`docs/cli/`](docs/cli/)
- Open Knowledge Format：[`docs/guides/open-knowledge-format.mdx`](docs/guides/open-knowledge-format.mdx)
- MCP 集成：[`docs/guides/mcp-agent-integration.mdx`](docs/guides/mcp-agent-integration.mdx)
- SDK：[`docs/guides/sdk.mdx`](docs/guides/sdk.mdx)
- Atomic Memory bridge：[`docs/guides/atomic-memory-bridge.mdx`](docs/guides/atomic-memory-bridge.mdx)

在本地预览文档站点需要 Node 24：

```bash
cd docs
volta run --node 24 npx mint dev --port 3001
```

## 当前版本

**已发布 `1.1.0`：**

- 模板分发生态：发布者可以用 `template publish init | add | build | rotate | revoke` 编写带签名的离线分发包，支持 Ed25519 签名、密钥轮换和包撤销，并可通过 `template publish verify` 校验。
- 使用方可以配置显式信任的模板 tap，发现和检查带签名目录，并在锁定状态下通过连续性、撤销和兼容性检查来安装或更新模板。
- 新增 `llmwiki status` 命令：可读性更好的状态快照，展示页面与来源数量、最近编译时间、过期和孤立页面、待处理变更、评审队列、当前 profile 和状态文件健康度。

**已发布 `1.0.0`：**

- 在 CLI、SDK、MCP、viewer、context、lint、status、export 和 profile-aware OKF exchange 上全面支持 CLP。
- 内置 `autosci` 和 `newsroom` 模板、类型化工作流与动作、一等公民工件、类型化关系和运行时生命周期门禁，以及结合 Crossref 的强化一方连接器底座。
- 类型化页面语义搜索与检索控制、批量 embedding、并行编译和 fail-closed 状态恢复。

版本历史见 [`CHANGELOG.md`](CHANGELOG.md)。

## 配套项目：Atomic Memory

llmwiki 与 [Atomic Memory](https://github.com/atomicstrata/atomicmemory) 是互补的开放上下文基础设施：

- **llmwiki** 把来源资料编译成可长期保留、可检查的知识。
- **Atomic Memory** 为 Agent 提供可搜索、可限定作用域、可纠正且可检查的运行时记忆。

你可以分别使用，也可以一起使用。[`@atomicmemory/llmwiki`](https://github.com/atomicstrata/atomicmemory/tree/main/packages/llmwiki) bridge 会把 `llmwiki export --target json --project-id <id>` 导入为可持久保存的记忆记录。

## 贡献

欢迎贡献。如果 llmwiki 缺少你需要的能力，欢迎提 issue 或 PR，描述你想支持的工作流。很多时候，最好的改进都来自真实需求。如果你想更广泛地参与，roadmap 事项是很好的切入点。对于涉及核心 compile、review、import/export 或 retrieval 语义的大改动，建议先开 issue 或设计讨论，先把契约对齐。

在提交代码变更之前，请运行：

```bash
npx tsc --noEmit
npm run build
npm test
npm run fallow:ci
```

详见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 许可证

MIT

## 免责声明

本仓库在制作过程中，没有任何 LLM 受到伤害。
