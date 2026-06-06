"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkbenchLayout from "@/components/WorkbenchLayout";
import StageHeader from "@/components/StageHeader";
import { loadProject, saveProject } from "@/lib/storage";
import type { ChoreoProject, FinalPiece } from "@/lib/types";
import { emptyProject } from "@/lib/types";

export default function FinalPage() {
  const router = useRouter();
  const [project, setProject] = useState<ChoreoProject>(emptyProject());
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProject();
    setProject(p);
    if (!p.finalPiece) router.replace("/rehearsal");
  }, [router]);

  const regenerate = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/choreo-agent", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "generate_final", project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "请求失败");
      const next = { ...project, finalPiece: data.finalPiece };
      setProject(next); saveProject(next);
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  const f = project.finalPiece;
  if (!f) return null;

  const fullText = renderFullPlan(project, f);
  const copy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <WorkbenchLayout project={project}>
      <StageHeader current="final" />
      <h1 className="text-2xl font-medium mb-1">{f.title}</h1>
      <p className="text-sm text-muted mb-1">
        {f.durationSec}s · {f.sections.length} 段 · {project.intake.performerCount} 人
      </p>
      <p className="text-base italic text-ink/80 mb-6">{f.logline}</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Meta k="音乐" v={f.music} />
        <Meta k="道具" v={f.props} />
        <Meta k="舞台" v={f.stageScene} />
      </div>

      <div className="space-y-3">
        {f.sections.map((s) => (
          <div key={s.index} className="card">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="tag !text-ink !border-ink">§{s.index}</span>
                <span className="text-lg font-medium align-middle">{s.name}</span>
              </div>
              <span className="text-xs text-muted font-mono">{s.timeRange}</span>
            </div>
            <Row k="场景">{s.sceneDescription}</Row>
            <Row k="动作方向">{s.movementDirection}</Row>
            <Row k="保留的动作种子">
              <ul className="list-disc pl-4 space-y-0.5">
                {s.retainedSeeds.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Row>
            <Row k="舞台调度">{s.staging}</Row>
            <Row k="音乐节奏">{s.musicFeeling}</Row>
            <Row k="道具">{s.props}</Row>
            <Row k="转场">{s.transitionOut}</Row>
            <Row k="排练提醒">
              <ul className="list-disc pl-4 space-y-0.5">
                {s.rehearsalReminders.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Row>
          </div>
        ))}
      </div>

      {f.performerNotes && (
        <div className="card mt-4 border-ink/40">
          <div className="label mb-1">给表演者</div>
          <div className="text-sm">{f.performerNotes}</div>
        </div>
      )}

      {err && <div className="text-sm text-accent mt-4">⚠ {err}</div>}

      <div className="mt-6 flex items-center gap-3">
        <button className="btn" onClick={copy}>{copied ? "✓ 已复制完整方案" : "复制完整编舞方案"}</button>
        <button className="btn-ghost" disabled={loading} onClick={regenerate}>
          {loading ? "AI 重写中…" : "重新生成最终作品"}
        </button>
      </div>

      <details className="mt-6">
        <summary className="text-xs text-muted cursor-pointer">查看可复制纯文本</summary>
        <pre className="mt-2 p-4 bg-white border border-line text-xs whitespace-pre-wrap leading-relaxed">{fullText}</pre>
      </details>
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
    <div className="grid grid-cols-[100px_1fr] gap-3 py-1 border-b border-line/60 last:border-0">
      <div className="label pt-1">{k}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function renderFullPlan(p: ChoreoProject, f: FinalPiece): string {
  const m = p.macroStructure;
  const lines: string[] = [];
  lines.push(`【${f.title}】`);
  lines.push(`时长：${f.durationSec}s ｜ 人数：${p.intake.performerCount} ｜ 空间：${p.intake.space || "未填"}`);
  lines.push(`Logline：${f.logline}`);
  lines.push("");
  lines.push(`── 整体设定 ──`);
  lines.push(`音乐：${f.music}`);
  lines.push(`道具：${f.props}`);
  lines.push(`舞台：${f.stageScene}`);
  lines.push("");
  if (m) {
    lines.push(`── 宏观结构（编导构思）──`);
    lines.push(`立意：${m.oneLineThesis}`);
    lines.push(`结构逻辑：${m.structureLogic}`);
    lines.push("");
  }
  lines.push(`── 段落排练方案 ──`);
  f.sections.forEach((s) => {
    lines.push(`§${s.index} ${s.name}  [${s.timeRange}]`);
    lines.push(`  场景：${s.sceneDescription}`);
    lines.push(`  动作方向：${s.movementDirection}`);
    lines.push(`  保留的动作种子：`);
    s.retainedSeeds.forEach((x) => lines.push(`    · ${x}`));
    lines.push(`  舞台调度：${s.staging}`);
    lines.push(`  音乐节奏：${s.musicFeeling}`);
    lines.push(`  道具：${s.props}`);
    lines.push(`  转场：${s.transitionOut}`);
    lines.push(`  排练提醒：`);
    s.rehearsalReminders.forEach((x) => lines.push(`    · ${x}`));
    lines.push("");
  });
  if (f.performerNotes) {
    lines.push(`── 给表演者 ──`);
    lines.push(f.performerNotes);
  }
  return lines.join("\n");
}
