"use client";

import { ChoreoProject } from "@/lib/types";
import ProjectDossier from "./ProjectDossier";
import Link from "next/link";
import { resetProject } from "@/lib/storage";

export default function WorkbenchLayout({
  project,
  onReset,
  children,
}: {
  project: ChoreoProject;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="workbench-grid">
      <ProjectDossier project={project} />
      <main className="p-8 max-w-[960px]">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-sm tracking-widest uppercase text-muted hover:text-ink">
            ◇ 编舞 Agent · 排练工作台
          </Link>
          <button
            className="btn-ghost text-xs"
            onClick={() => {
              if (confirm("丢弃当前项目，重新开始？")) {
                resetProject();
                onReset?.();
                window.location.href = "/";
              }
            }}
          >
            重置项目
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
