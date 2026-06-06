// 编舞项目核心数据结构 —— 5 阶段流转。
//
// 流程：
//   intake → concept → macro → rehearsal → final
//
// 排练阶段对每段循环：
//   生成排练卡（rehearsalCard） → 用户实践反馈（feedback）
//     → AI 编导点评（directorFeedback）
//       → nextStep: revise_current_section | move_to_next_section | generate_final_work
//
// "动觉阻抗 / 身体阻抗"等术语只存在于后台 SYSTEM_PROMPT 作为编导判据，
// 任何在用户界面上呈现的字段都不能出现这些词。

export type Stage =
  | "intake"
  | "concept"
  | "macro"
  | "rehearsal"
  | "final";

/* ────────────────── Stage 1 intake ────────────────── */

export interface Intake {
  feelings: string;
  story: string;
  existingIdea: string;
  performerCount: number;
  durationSec: number;
  space: string;
  props: string;
}

/* ────────────────── Stage 2 concept ────────────────── */

export interface ConceptSectionSketch {
  title: string;
  function: string;
  stageContent: string;
  spatialDevelopment: string;
  emotionShift: string;
}

export interface ChoreographicConcept {
  id: string;
  title: string;
  thesis: string;
  choreographicQuestion: string;
  structureType: string;
  arc: string;
  sectionSketches: ConceptSectionSketch[];
  musicDirection: string;
  propDirection: string;
  stageScene: string;
  whyDanceable: string;
  feasibility: string;
  risks: string;
  clichesToAvoid: string[];
}

/* ────────────────── Stage 3 macro ────────────────── */

export interface MacroSection {
  index: number;
  id: string;                  // sectionId（稳定），便于排练阶段引用
  title: string;
  durationSec: number;
  function: string;
  stageContent: string;
  spatialDevelopment: string;
  performerRelation: string;
  energyShift: string;
  transitionOut: string;
}

export interface MacroStructure {
  workingTitle: string;
  oneLineThesis: string;
  structureLogic: string;
  totalDurationSec: number;
  sections: MacroSection[];
  musicArc: string;
  propLogic: string;
  stageScene: string;
  directorReminders: string[];
}

/* ────────────────── Stage 4 rehearsal ────────────────── */

export interface MovementSeed {
  id: string;
  description: string;     // 具体：从哪开始 / 往哪去 / 节奏如何（必须像"从脚跟开始轻轻离地…"那种句子）
  bodyFocus: string;
  spaceFocus: string;
  timingFocus: string;
}

export interface SectionRehearsalCard {
  sectionId: string;
  sectionTitle: string;
  sectionFunction: string;
  sceneDescription: string;
  performerState: string;
  movementInspiration: string;
  bodyEntryPoints: string[];
  spatialRoute: string;
  stagingNotes: string;
  movementSeeds: MovementSeed[];   // 5~8 个
  avoid: string[];
  musicFeeling: string;
  feedbackQuestions: string[];
  revision: number;                // 0 = 初版；1 = 第一次修订
}

export interface SectionFeedback {
  sectionId: string;
  revision: number;                // 对应该次排练卡的版本
  mostUsefulSeed: string;
  leastUsefulSeed: string;
  strongestBodySensation: string;
  newMovementDiscovered: string;
  awkwardOrFakeMoment: string;
  preferredSpacePoint: string;
  desiredAdjustment: string;       // 更慢 / 更快 / 更轻 / 更重 / 更紧 / 更松
  freeReflection: string;
}

export type NextStep =
  | "revise_current_section"
  | "move_to_next_section"
  | "generate_final_work";

export interface DirectorFeedback {
  sectionId: string;
  revision: number;
  retain: string[];
  revise: string[];
  discard: string[];
  diagnosis: string;
  concreteSuggestions: string[];
  revisedMovementDirection: string;
  transitionToNextSection: string;
  nextStep: NextStep;
}

/* ────────────────── Stage 5 final ────────────────── */

export interface FinalSection {
  index: number;
  sectionId: string;
  name: string;
  timeRange: string;             // "0:00 - 0:15"
  sceneDescription: string;
  movementDirection: string;
  retainedSeeds: string[];       // 上一阶段保留的动作种子（描述）
  staging: string;               // 舞台调度
  musicFeeling: string;
  props: string;
  transitionOut: string;
  rehearsalReminders: string[];
}

export interface FinalPiece {
  title: string;
  durationSec: number;
  logline: string;
  music: string;
  props: string;
  stageScene: string;
  performerNotes: string;
  sections: FinalSection[];
}

/* ────────────────── 项目根 ────────────────── */

export interface ChoreoProject {
  id: string;
  createdAt: number;
  updatedAt: number;
  stage: Stage;

  intake: Intake;

  choreographicConcepts: ChoreographicConcept[];
  selectedConceptId: string | null;

  macroStructure: MacroStructure | null;

  // 排练阶段：以 sectionId 为键
  currentSectionIndex: number;                       // 0-based 指向 macroStructure.sections
  rehearsalCards: SectionRehearsalCard[];            // 同一段如修订会有 revision 0/1
  sectionFeedbacks: SectionFeedback[];
  directorFeedbacks: DirectorFeedback[];

  finalPiece: FinalPiece | null;
}

export const emptyProject = (): ChoreoProject => ({
  id: `proj_${Date.now()}`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  stage: "intake",
  intake: {
    feelings: "",
    story: "",
    existingIdea: "",
    performerCount: 1,
    durationSec: 90,
    space: "",
    props: "",
  },
  choreographicConcepts: [],
  selectedConceptId: null,
  macroStructure: null,
  currentSectionIndex: 0,
  rehearsalCards: [],
  sectionFeedbacks: [],
  directorFeedbacks: [],
  finalPiece: null,
});

export const STAGE_LABEL: Record<Stage, string> = {
  intake: "原始素材",
  concept: "编导构思",
  macro: "宏观结构",
  rehearsal: "段落排练",
  final: "作品生成",
};

/** 当前段允许的最大修订次数（每段最多修订 1 次） */
export const MAX_REVISIONS_PER_SECTION = 1;

/** 工具：返回某段的所有排练卡、反馈、编导点评 */
export function getSectionTrail(p: ChoreoProject, sectionId: string) {
  return {
    cards: p.rehearsalCards.filter((c) => c.sectionId === sectionId),
    feedbacks: p.sectionFeedbacks.filter((f) => f.sectionId === sectionId),
    directorFeedbacks: p.directorFeedbacks.filter((d) => d.sectionId === sectionId),
  };
}
