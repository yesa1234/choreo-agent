# 编舞 Agent · 排练工作台

基于「意象锚定的动觉阻抗场」理论的 AI 编舞陪练 demo。
不接摄像头、不做姿态识别。AI 不直接生成动作，只构造**身体矛盾**和**意象锚**，让身体在阻抗中自己长出动作。

## 工作流（四步）

1. **创作入口** — 收集感受 / 故事 / 已有构思 / 人数 / 时长 / 空间 / 道具。
2. **意象锚定** — AI 反向提炼 3 个候选主题；用户选 1 个；AI 展开音乐 / 道具 / 舞台 + 第 1 轮 score。
3. **排练轮次** — 共 3 轮：用户按 score 实际排，回来用语言反馈 → AI 诊断有效材料 / 俗套 / 动作惯性，并加阻抗生成下一轮。
4. **作品生成** — 合成 1–2 分钟舞蹈小品结构（含舞台调度、空间路径、队形、视线、出入场、停顿、道具关系），支持一键复制完整方案。

整个过程的项目状态保存在浏览器 `localStorage`（key: `choreo:project:v1`），刷新不丢。

## 本地运行

```bash
cd 编舞agent
npm install
cp .env.local.example .env.local   # 不填也能跑（走 mock）
npm run dev
# 打开 http://localhost:3000
```

### 接入大模型

`.env.local` 二选一即可，优先级 Anthropic > OpenAI > mock：

```
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-6        # 可选，默认 claude-sonnet-4-6

# 或者
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini                 # 可选
```

不配置任何 key 时，`/api/choreo-agent` 走 `lib/llm.ts` 里的 mock 数据，整个 4 步流程依然可走完，便于先看 UI 和数据流。

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `lib/types.ts` | `ChoreoProject` 等数据结构 |
| `lib/storage.ts` | localStorage 读写 |
| `lib/prompts.ts` | 所有阶段的 system / user prompt |
| `lib/llm.ts` | Anthropic / OpenAI / mock 三路供应商抽象 |
| `lib/schema.ts` | LLM 返回 JSON 的最小校验 |
| `app/api/choreo-agent/route.ts` | 唯一后端入口，按 `action` 分发 |
| `app/page.tsx` / `app/anchor` / `app/rehearsal` / `app/final` | 四个阶段页 |
| `components/WorkbenchLayout.tsx` | 排练工作台外壳（左侧创作档案 + 主区） |
| `components/ProjectDossier.tsx` | 实时项目档案侧栏 |
| `components/BodyScoreCard.tsx` | 身体 score 展示卡 |
| `components/FeedbackForm.tsx` | 语言反馈表单 |

## API

`POST /api/choreo-agent`

```ts
type Action =
  | { action: "generate_candidates"; project: ChoreoProject }
  | { action: "expand_anchor";       project: ChoreoProject; chosenId: string }
  | { action: "diagnose_round";      project: ChoreoProject; round: 1 | 2 | 3 }
  | { action: "generate_final";      project: ChoreoProject };
```

每个 action 返回结构化 JSON，schema 见 `lib/prompts.ts` 中每个 prompt 末尾约定。

## 设计取舍

- **AI 不写动作**：所有输出强制以「意象锚 + 身体任务（必含矛盾）+ 禁止清单」表达。
- **禁止清单**：每条 score 主动列出要避免的俗套形态（"贴胸口 / 慢倒地 / 兰花指" 等），抑制动作惯性。
- **三轮迭代**：每轮反馈后 AI 标注 *effectiveMaterial / clicheMaterial / motorHabits / keptMoments*，下一轮 score 必须叠加新阻抗。
- **作品生成只能用 keptMoments**：最终结构必须复用前几轮被保留的瞬间，避免推翻重做。
