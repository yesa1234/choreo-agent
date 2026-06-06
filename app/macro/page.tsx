"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkbenchLayout from "@/components/WorkbenchLayout";
import StageHeader from "@/components/StageHeader";
import { loadProject, saveProject } from "@/lib/storage";
import type { ChoreoProject } from "@/lib/types";
import { emptyProject } from "@/lib/types";

export default function MacroPage() {
  const router = useRouter();
  const [project, setProject] = useState<ChoreoProject>(emptyProject());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProject();
    setProject(p);
    if (!p.macroStructure) router.replace("/concept");
  }, [router]);

  const regenerate = async () => {
    if (!project.selectedConceptId) return;
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/choreo-agent", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "build_macro", project, conceptId: project.selectedConceptId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "请求失败");
      const next = { ...project, macroStructure: data.macroStructure };
      setProject(next); saveProject(next);
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  const goRehearse = async () => {
    if (!project.macroStructure) return;
    setLoading(true); setErr(null);
    try {
      const firstSection = project.macroStructure.sections[0];
      // 生成第 1 段排练卡
      const res = await fetch("/api/choreo-agent", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "generate_section_card", project,
          sectionId: firstSection.id, revision: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "请求失败");
      const next: ChoreoProject = {
        ...project,
        stage: "rehearsal",
        currentSectionIndex: 0,
        rehearsalCards: [data.card],
      };
      setProject(next); saveProject(next);
      router.push("/rehearsal");
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  const m = project.macroStructure;
  if (!m) return null;

  return (
    <WorkbenchLayout project={project}>
      <StageHeader current="macro" />
      <h1 className="text-2xl font-medium mb-1">{m.workingTitle}</h1>
      <p className="text-sm italic text-ink/80 mb-1">{m.oneLineThesis}</p>
      <p className="text-xs text-muted mb-6">
        共 {m.totalDurationSec}s · {m.sections.length} 段 · 结构逻辑：{m.structureLogic}
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Meta k="音乐走向" v={m.musicArc} />
        <Meta k="道具逻辑" v={m.propLogic} />
        <Meta k="舞台场景" v={m.stageScene} />
      </div>

      <div className="space-y-3 mb-6">
        {m.sections.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="tag !text-ink !border-ink">§{s.index}</span>
                <span className="text-lg font-medium align-middle">{s.title}</span>
              </div>
              <span className="text-xs text-muted font-mono">{s.durationSec}s</span>
            </div>
            <Row k="编舞功能">{s.function}</Row>
            <Row k="舞台内容">{s.stageContent}</Row>
            <Row k="空间发展">{s.spatialDevelopment}</Row>
            <Row k="舞者关系">{s.performerRelation}</Row>
            <Row k="情绪 / 能量">{s.energyShift}</Row>
            <Row k="转入下一段">{s.transitionOut}</Row>
          </div>
        ))}
      </div>

      <div className="card border-ink/40 mb-6">
        <div className="label mb-2">编导提醒 · 最应避免的俗套</div>
        <div>
          {m.directorReminders.map((d, i) => (
            <span key={i} className="tag !border-accent/40 !text-accent">✗ {d}</span>
          ))}
        </div>
      </div>

      {err && <div className="text-sm text-accent mt-4">⚠ {err}</div>}

      <div className="mt-6 flex items-center gap-3">
        <button className="btn" disabled={loading} onClick={goRehearse}>
          {loading ? "AI 正在准备第一段排练卡…" : "确认结构 → 进入第一段排练"}
        </button>
        <button className="btn-ghost" disabled={loading} onClick={regenerate}>
          重新生成结构
        </button>
      </div>
    </WorkbenchLayout>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="card !p-3">
      <div className="label mb-1">{k}</div>
      <div className="text-xs leading-relaxed">{v}</div>
    </div>
  );
}
function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3 py-1 border-b border-line/60 last:border-0">
      <div className="label pt-1">{k}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
