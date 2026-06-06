"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkbenchLayout from "@/components/WorkbenchLayout";
import StageHeader from "@/components/StageHeader";
import { loadProject, saveProject } from "@/lib/storage";
import type { ChoreoProject, ChoreographicConcept } from "@/lib/types";
import { emptyProject } from "@/lib/types";

export default function ConceptPage() {
  const router = useRouter();
  const [project, setProject] = useState<ChoreoProject>(emptyProject());
  const [chosen, setChosen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProject();
    setProject(p);
    if (p.choreographicConcepts.length === 0) router.replace("/");
  }, [router]);

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
      setProject(next); saveProject(next); setChosen(null);
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

  return (
    <WorkbenchLayout project={project}>
      <StageHeader current="concept" />
      <h1 className="text-2xl font-medium mb-1">编导构思方向</h1>
      <p className="text-sm text-muted mb-6">
        AI 编导从你的素材里提炼了 3 个能成立的作品方向。读完之后选一个——选那个让你身体里有反应的，不一定是最"聪明"的。
      </p>

      <div className="space-y-3">
        {project.choreographicConcepts.map((c: ChoreographicConcept) => {
          const sel = chosen === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setChosen(c.id)}
              className={`w-full text-left card transition-all ${
                sel ? "!border-ink ring-2 ring-ink/10" : "hover:!border-ink/40"
              }`}
            >
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-lg font-medium">{c.title}</div>
                <span className="text-xs text-muted">{sel ? "已选" : "点击选择"}</span>
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
            </button>
          );
        })}
      </div>

      {err && <div className="text-sm text-accent mt-4">⚠ {err}</div>}

      <div className="mt-6 flex items-center gap-3">
        <button className="btn" disabled={!chosen || loading} onClick={confirm}>
          {loading ? "AI 正在整理为可排练的宏观结构…" : "选这个方向 → 看作品宏观结构"}
        </button>
        <button className="btn-ghost" disabled={loading} onClick={regenerate}>
          重新生成构思
        </button>
      </div>
    </WorkbenchLayout>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 py-1 text-sm border-b border-line/40 last:border-0">
      <div className="label pt-1">{k}</div>
      <div>{children}</div>
    </div>
  );
}
