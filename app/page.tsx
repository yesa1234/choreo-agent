"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkbenchLayout from "@/components/WorkbenchLayout";
import StageHeader from "@/components/StageHeader";
import { loadProject, saveProject } from "@/lib/storage";
import type { ChoreoProject } from "@/lib/types";
import { emptyProject } from "@/lib/types";

export default function IntakePage() {
  const router = useRouter();
  const [project, setProject] = useState<ChoreoProject>(emptyProject());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setProject(loadProject());
  }, []);

  const update = (patch: Partial<ChoreoProject["intake"]>) => {
    const next = { ...project, intake: { ...project.intake, ...patch } };
    setProject(next);
    saveProject(next);
  };

  const canNext =
    project.intake.feelings.trim().length +
      project.intake.story.trim().length +
      project.intake.existingIdea.trim().length >
    10;

  const handleNext = async () => {
    setLoading(true); setErr(null);
    try {
      const next: ChoreoProject = { ...project, stage: "concept" };
      setProject(next); saveProject(next);
      const res = await fetch("/api/choreo-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "generate_concepts", project: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "请求失败");
      const updated: ChoreoProject = { ...next, choreographicConcepts: data.concepts };
      setProject(updated); saveProject(updated);
      router.push("/concept");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkbenchLayout project={project}>
      <StageHeader current="intake" />
      <h1 className="text-2xl font-medium mb-1">创作入口</h1>
      <p className="text-sm text-muted mb-6">
        把你现在还很模糊的素材都丢进来。下一步 AI 编导会从中提炼出 3 个完整的作品方向供你选择。
      </p>

      <div className="card space-y-4">
        <Field label="近期感受（具体到身体或情境，不要抽象词）">
          <textarea className="field" rows={3}
            placeholder="例如：地铁上抬头看广告灯箱的瞬间觉得自己很轻……"
            value={project.intake.feelings}
            onChange={(e) => update({ feelings: e.target.value })} />
        </Field>
        <Field label="一件具体的故事 / 经历">
          <textarea className="field" rows={3}
            value={project.intake.story}
            onChange={(e) => update({ story: e.target.value })} />
        </Field>
        <Field label="已有的构思（如果完全没有就留空）">
          <textarea className="field" rows={2}
            value={project.intake.existingIdea}
            onChange={(e) => update({ existingIdea: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="人数">
            <input type="number" min={1} max={20} className="field"
              value={project.intake.performerCount}
              onChange={(e) => update({ performerCount: Number(e.target.value) || 1 })} />
          </Field>
          <Field label="目标时长（秒）">
            <input type="number" min={30} max={300} step={15} className="field"
              value={project.intake.durationSec}
              onChange={(e) => update({ durationSec: Number(e.target.value) || 90 })} />
          </Field>
        </div>
        <Field label="空间（剧场 / 教室 / 户外 / 黑匣子 / 走廊）">
          <input className="field"
            value={project.intake.space}
            onChange={(e) => update({ space: e.target.value })} />
        </Field>
        <Field label="可用道具（逗号分隔，可以写「没有」）">
          <input className="field"
            value={project.intake.props}
            onChange={(e) => update({ props: e.target.value })} />
        </Field>
      </div>

      {err && <div className="text-sm text-accent mt-4">⚠ {err}</div>}

      <div className="mt-6 flex items-center gap-3">
        <button className="btn" disabled={!canNext || loading} onClick={handleNext}>
          {loading ? "AI 编导正在构思…" : "提交素材 → 看 3 个编导构思方向"}
        </button>
        {!canNext && <span className="text-xs text-muted">至少写一点感受 / 故事 / 构思</span>}
      </div>
    </WorkbenchLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}
