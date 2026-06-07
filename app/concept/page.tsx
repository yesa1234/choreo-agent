"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkbenchLayout from "@/components/WorkbenchLayout";
import StageHeader from "@/components/StageHeader";
import { loadProject, saveProject } from "@/lib/storage";
import type { ChoreoProject, ChoreographicConcept } from "@/lib/types";
import { emptyProject } from "@/lib/types";

type Intent = "keep" | "refine" | "redo";
type IntentMap = Record<string, Intent>;

export default function ConceptPage() {
  const router = useRouter();
  const [project, setProject] = useState<ChoreoProject>(emptyProject());
  const [chosen, setChosen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 反馈对话状态
  const [intents, setIntents] = useState<IntentMap>({});
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    const p = loadProject();
    setProject(p);
    if (p.choreographicConcepts.length === 0) router.replace("/");
    else {
      // 默认每个方案 intent = keep
      setIntents(Object.fromEntries(p.choreographicConcepts.map((c) => [c.id, "keep"])));
    }
  }, [router]);

  /** 不带反馈，直接重投骰子 */
  const regenerate = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/choreo-agent", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "generate_concepts", project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "请求失败");
      const next = { ...project, choreographicConcepts: data.concepts };
      setProject(next); saveProject(next);
      setChosen(null);
      setIntents(Object.fromEntries(data.concepts.map((c: ChoreographicConcept) => [c.id, "keep"])));
      setFeedbackText("");
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  /** 根据反馈和每个方案的处理意图重生 */
  const refine = async () => {
    const hasIntentChange = Object.values(intents).some((v) => v !== "keep");
    if (!feedbackText.trim() && !hasIntentChange) {
      setErr("请至少写一点反馈，或者把某个方案标记为「重做」/「按反馈改」。");
      return;
    }
    setLoading(true); setErr(null);
    try {
      const intentList = project.choreographicConcepts.map((c) => ({
        id: c.id,
        intent: intents[c.id] ?? "keep",
      }));
      const res = await fetch("/api/choreo-agent", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "refine_concepts",
          project,
          feedbackText,
          intents: intentList,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "请求失败");
      const next = { ...project, choreographicConcepts: data.concepts };
      setProject(next); saveProject(next);
      setChosen(null);
      setIntents(Object.fromEntries(data.concepts.map((c: ChoreographicConcept) => [c.id, "keep"])));
      setFeedbackText("");
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  const confirm = async () => {
    if (!chosen) return;
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/choreo-agent", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "build_macro", project, conceptId: chosen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "请求失败");
      const next: ChoreoProject = {
        ...project,
        stage: "macro",
        selectedConceptId: chosen,
        macroStructure: data.macroStructure,
      };
      setProject(next); saveProject(next);
      router.push("/macro");
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  const setIntent = (id: string, v: Intent) => setIntents((m) => ({ ...m, [id]: v }));

  const intentChange = Object.values(intents).some((v) => v !== "keep");

  return (
    <WorkbenchLayout project={project}>
      <StageHeader current="concept" />
      <h1 className="text-2xl font-medium mb-1">编导构思方向</h1>
      <p className="text-sm text-muted mb-6">
        AI 编导从你的素材里提炼了 3 个能成立的作品方向。读完之后选一个——选那个让你身体里有反应的，不一定是最"聪明"的。<br/>
        如果都不满意，可以在每张卡上标记「保留 / 按反馈改 / 重做」，再写下你的想法，让 AI 重生一轮。
      </p>

      <div className="space-y-3">
        {project.choreographicConcepts.map((c: ChoreographicConcept) => {
          const sel = chosen === c.id;
          const intent = intents[c.id] ?? "keep";
          return (
            <div
              key={c.id}
              className={`card transition-all ${
                sel ? "!border-ink ring-2 ring-ink/10" : ""
              }`}
            >
              {/* 头部：标题 + 选择 + intent 标记 */}
              <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
                <button
                  onClick={() => setChosen(c.id)}
                  className="text-left text-lg font-medium hover:underline"
                >
                  {c.title}
                  <span className="ml-2 text-xs text-muted font-normal">
                    {sel ? "✓ 已选" : "点击选这个方向"}
                  </span>
                </button>
                <div className="flex items-center gap-1 text-xs">
                  <IntentBtn cur={intent} v="keep" onClick={() => setIntent(c.id, "keep")}>保留</IntentBtn>
                  <IntentBtn cur={intent} v="refine" onClick={() => setIntent(c.id, "refine")}>按反馈改</IntentBtn>
                  <IntentBtn cur={intent} v="redo" onClick={() => setIntent(c.id, "redo")}>重做</IntentBtn>
                </div>
              </div>

              <Row k="主题立意">{c.thesis}</Row>
              <Row k="核心编舞问题"><span className="italic">「{c.choreographicQuestion}」</span></Row>
              <Row k="结构类型">{c.structureType}</Row>
              <Row k="整体弧线">{c.arc}</Row>
              <Row k="段落设计">
                <ol className="list-decimal pl-4 space-y-1">
                  {c.sectionSketches.map((s, i) => (
                    <li key={i}>
                      <b>{s.title}</b>（{s.function}）— {s.stageContent}
                      <div className="text-xs text-muted">
                        空间：{s.spatialDevelopment} ｜ 情绪：{s.emotionShift}
                      </div>
                    </li>
                  ))}
                </ol>
              </Row>
              <Row k="音乐方向">{c.musicDirection}</Row>
              <Row k="道具方向">{c.propDirection}</Row>
              <Row k="舞台场景">{c.stageScene}</Row>
              <Row k="为什么是舞">{c.whyDanceable}</Row>
              <Row k="可行性">{c.feasibility}</Row>
              <Row k="风险">{c.risks}</Row>
              <Row k="要避免">
                {c.clichesToAvoid.map((x, i) => (
                  <span key={i} className="tag !border-accent/40 !text-accent">✗ {x}</span>
                ))}
              </Row>
            </div>
          );
        })}
      </div>

      {/* 反馈输入区 */}
      <div className="card mt-4 border-ink/40">
        <div className="label mb-2">和 AI 编导对话 · 告诉它该怎么改</div>
        <textarea
          className="field"
          rows={4}
          placeholder="例如：三个都太抒情了，我想要更冷一点、更结构化、不要拥抱不要倒地。第 2 个方向不错但太难做，能不能给个 2 人版本？"
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
        />
        <div className="mt-2 text-xs text-muted">
          已标记：
          {project.choreographicConcepts.map((c) => (
            <span key={c.id} className="mr-2">
              {c.title}=<b>{intentLabel(intents[c.id] ?? "keep")}</b>
            </span>
          ))}
        </div>
      </div>

      {err && <div className="text-sm text-accent mt-4">⚠ {err}</div>}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button className="btn" disabled={!chosen || loading} onClick={confirm}>
          {loading ? "AI 正在整理为可排练的宏观结构…" : "选这个方向 → 看作品宏观结构"}
        </button>
        <button
          className="btn-ghost"
          disabled={loading || (!feedbackText.trim() && !intentChange)}
          onClick={refine}
          title={!feedbackText.trim() && !intentChange ? "先写反馈或调整方案标签" : ""}
        >
          根据反馈重新生成
        </button>
        <button className="btn-ghost" disabled={loading} onClick={regenerate}>
          完全重投一轮
        </button>
      </div>
    </WorkbenchLayout>
  );
}

function IntentBtn({
  cur, v, onClick, children,
}: {
  cur: Intent; v: Intent; onClick: () => void; children: React.ReactNode;
}) {
  const active = cur === v;
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 border rounded transition-colors ${
        active
          ? v === "redo"
            ? "border-accent text-accent bg-accent/5"
            : v === "refine"
              ? "border-ink text-ink bg-ink/5"
              : "border-ink/60 text-ink/80 bg-ink/5"
          : "border-line text-muted hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}

function intentLabel(v: Intent) {
  return v === "keep" ? "保留" : v === "refine" ? "按反馈改" : "重做";
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 py-1 text-sm border-b border-line/40 last:border-0">
      <div className="label pt-1">{k}</div>
      <div>{children}</div>
    </div>
  );
}
