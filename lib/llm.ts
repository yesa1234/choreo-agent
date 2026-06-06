// 模型供应商抽象。优先 Anthropic，其次 火山方舟 Ark / OpenAI，最后 mock。
// 所有调用都要求返回严格 JSON 字符串。

type Provider = "anthropic" | "openai" | "ark" | "mock";

export function detectProvider(): Provider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.ARK_API_KEY) return "ark";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export interface LLMCallArgs {
  system: string;
  user: string;
}

export async function callLLM({ system, user }: LLMCallArgs): Promise<string> {
  const provider = detectProvider();
  if (provider === "anthropic") return callAnthropic(system, user);
  if (provider === "ark") return callArk(system, user);
  if (provider === "openai") return callOpenAI(system, user);
  return callMock(user);
}

// 火山方舟 Ark —— OpenAI 兼容的 /chat/completions 协议
async function callArk(system: string, user: string): Promise<string> {
  const model = process.env.ARK_MODEL || "doubao-seed-2-0-pro-260215";
  const base = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: user + "\n\n请严格输出 JSON 对象，不要使用 ```json 包裹，不要在 JSON 之外说任何话。",
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ark ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return stripCodeFence(text);
}

async function callAnthropic(system: string, user: string): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user + "\n\n请严格输出 JSON，不要使用 ```json 包裹。" }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";
  return stripCodeFence(text);
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return stripCodeFence(text);
}

function stripCodeFence(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  }
  return t;
}

/* ──────────────────────── mock fallback ────────────────────────
   按 prompt 中的阶段关键词分支，文案禁止出现"阻抗 / constraint score"等术语。
*/
function callMock(user: string): string {

  // ── Stage 2 concept ──
  if (user.includes("专业编导构思")) {
    return JSON.stringify({
      concepts: [
        {
          id: "k1",
          title: "未拆封的信",
          thesis: "关于'想说但没说出口'的延迟与重量。一封一直没拆的信成为身上无法卸下的物。",
          choreographicQuestion: "当一只手想做一件事、另一只手在反对它时，身体如何不动声色地呈现这个事件？",
          structureType: "三段体（封口 / 传导 / 失去支点）+ 静默尾声",
          arc: "从极度收紧的微动开始，沿身体往上扩散，最终支撑被抽走、身体进入新的不平衡。",
          sectionSketches: [
            { title: "封口", function: "建立关系", stageContent: "坐于椅，两手夹信",
              spatialDevelopment: "几乎不动，光只在椅上", emotionShift: "压抑的克制" },
            { title: "传导", function: "扩散", stageContent: "上半身开始倾斜出椅面",
              spatialDevelopment: "椅前 30cm", emotionShift: "克制开始失败" },
            { title: "失去支点", function: "支撑抽走", stageContent: "椅被悄悄推走，重心一直偏离",
              spatialDevelopment: "原椅位 60cm 范围", emotionShift: "失败反复发生" },
            { title: "未拆", function: "收束", stageContent: "动作消失只剩呼吸，信仍未开",
              spatialDevelopment: "停在最后一次失败的位置", emotionShift: "首次直视观众" },
          ],
          musicDirection: "drone 低频铺底 + 偶发金属敲击，避免旋律性钢琴。Tim Hecker 方向。",
          propDirection: "一只木椅 + 一封未拆信。禁用纱巾 / 红绸。",
          stageScene: "深灰地胶，单点顶光在椅上，三面观众。",
          whyDanceable: "'拆与不拆'是身体的悬置——只有身体能让这种悬置可见。",
          feasibility: "1 人 90 秒、黑匣子、椅与信都易得，完全可行。",
          risks: "容易滑成 mime；容易把信贴胸口；容易做成抒情短剧。",
          clichesToAvoid: ["把信贴心口", "缓慢拆信", "看信落泪状", "把信举过头顶", "慢动作倒地"],
        },
        {
          id: "k2",
          title: "感应灯走廊",
          thesis: "夜里独处时'存在的间歇感'——身体只在灯亮的瞬间存在。",
          choreographicQuestion: "怎样让身体的'有'与'无'本身成为编舞主语？",
          structureType: "脉冲式：亮/暗循环 6 次，每次结构略变",
          arc: "前两次平静，第三次开始亮的间隔被打乱，第六次灯长亮但身体反而不出现。",
          sectionSketches: [
            { title: "第一次亮", function: "建立规则", stageContent: "亮时充满，暗时不存在",
              spatialDevelopment: "舞台中线", emotionShift: "客观" },
            { title: "节奏被打乱", function: "破坏规则", stageContent: "亮的长度随机化",
              spatialDevelopment: "横向位移", emotionShift: "焦灼" },
            { title: "亮但不出现", function: "反规则", stageContent: "灯长亮，身体停在暗时姿态",
              spatialDevelopment: "原地", emotionShift: "克制的拒绝" },
          ],
          musicDirection: "无音乐，只用灯的继电器声 + 极轻环境底噪。",
          propDirection: "无道具，灯是唯一的对手。",
          stageScene: "线性走廊式空间，观众沿一侧坐。",
          whyDanceable: "对'存在间歇'的回答必须由身体瞬时充满与消失来执行。",
          feasibility: "需要可控灯，1 人 90 秒可行。",
          risks: "容易做成灯光秀；容易让身体只是道具。",
          clichesToAvoid: ["在亮起时摆造型", "暗中爬行", "亮起瞬间惊讶状", "用手挡眼"],
        },
        {
          id: "k3",
          title: "潮湿的椅子",
          thesis: "关于'离不开的关系'：后背与椅面的黏与凉是这种关系最诚实的物质形态。",
          choreographicQuestion: "身体如何在'想离开'与'被黏住'之间生成动作，而不是表演两种情绪？",
          structureType: "AB 对位：离 / 留 反复，幅度不断升级",
          arc: "从微小的离意到反复失败，最终离开发生时反而平静。",
          sectionSketches: [
            { title: "黏", function: "建立物质感", stageContent: "后背贴椅，只有皮肤层的微动",
              spatialDevelopment: "完全在椅", emotionShift: "无情绪" },
            { title: "想走", function: "意图升起", stageContent: "前胸先发起、后背被黏住",
              spatialDevelopment: "上身向前倾", emotionShift: "焦躁" },
            { title: "撕开", function: "矛盾爆发", stageContent: "皮肤与椅面分离的细碎瞬间",
              spatialDevelopment: "离椅但脚不离开椅前 30cm", emotionShift: "解脱与失落同在" },
          ],
          musicDirection: "皮肤与塑料摩擦音的放大处理，无旋律。",
          propDirection: "一把贴了胶面的椅子，让黏成为物理事实。",
          stageScene: "极简白盒子，正面单光。",
          whyDanceable: "'黏'是触觉，必须由身体执行。",
          feasibility: "1 人 90 秒，需准备胶面，可行。",
          risks: "容易把'黏'演成挣扎；容易把椅子做成隐喻。",
          clichesToAvoid: ["把椅子扔走", "踢椅子", "椅子上跪立", "对椅子说话状"],
        },
      ],
    });
  }

  // ── Stage 3 macro ──
  if (user.includes("作品宏观结构")) {
    return JSON.stringify({
      macroStructure: {
        workingTitle: "未拆封的信",
        oneLineThesis: "一封没拆开的信成为身上无法卸下的物。",
        structureLogic: "从微动开始向上扩散，再让支撑消失，最后回到静止以暴露未拆。",
        totalDurationSec: 90,
        sections: [
          { index: 1, id: "s1", title: "封口", durationSec: 20, function: "建立关系",
            stageContent: "坐于椅，两手夹信，只允许胸腔起伏",
            spatialDevelopment: "椅上不动", performerRelation: "你与信的关系",
            energyShift: "高内压低位移", transitionOut: "肩胛开始介入" },
          { index: 2, id: "s2", title: "传导", durationSec: 25, function: "扩散",
            stageContent: "上半身倾斜出椅面，下半身仍坐",
            spatialDevelopment: "上身倾斜 30 度", performerRelation: "身体内部上下半身的关系",
            energyShift: "克制开始失败", transitionOut: "椅子被悄悄推走" },
          { index: 3, id: "s3", title: "失去支点", durationSec: 25, function: "支撑抽走",
            stageContent: "重心持续偏离中线，平衡反复失败",
            spatialDevelopment: "原椅位 60cm 范围", performerRelation: "你与不存在的椅",
            energyShift: "重复的失败", transitionOut: "音乐静音" },
          { index: 4, id: "s4", title: "未拆", durationSec: 20, function: "收束",
            stageContent: "动作消失只剩呼吸，信仍未开",
            spatialDevelopment: "停在最后一次失败位置", performerRelation: "你与观众",
            energyShift: "静止暴露未完成", transitionOut: "灯暗" },
        ],
        musicArc: "drone 60 秒后引入单次金属敲击；75 秒静音 5 秒。",
        propLogic: "椅在前 45 秒是支撑，第 45 秒被抽走；信全程在手。",
        stageScene: "深灰地胶，单点顶光，三面观众。",
        directorReminders: ["不要把信贴心口", "不要慢拆信", "不要真的摔倒", "不要扶墙", "不要戏剧性叹气"],
      },
    });
  }

  // ── Stage 4 段落排练卡 ──
  if (user.includes("段落排练卡")) {
    const m = user.match(/"sectionId"\s*:\s*"([^"]+)"/);
    const sectionId = m ? m[1] : "s1";
    const titleMatch = user.match(/"title"\s*:\s*"([^"]+)"/);
    const sectionTitle = titleMatch ? titleMatch[1] : "封口";
    const revisionMatch = user.match(/revision[=:]\s*(\d)/);
    const revision = (revisionMatch ? Number(revisionMatch[1]) : 0) as 0 | 1;

    return JSON.stringify({
      card: {
        sectionId,
        sectionTitle,
        sectionFunction: "建立你和那封信的关系",
        sceneDescription:
          "舞台中心一只木椅，单点顶光只罩在椅上。地胶是深灰的。三面观众安静坐着。空气是冷的，有点像深夜的厨房。",
        performerState:
          "你已经坐在椅子上一段时间了。两只手夹着一封封口未拆的信。你不打算拆它，但你也没办法把它放下。",
        movementInspiration:
          "封口胶被指尖一点点撕开时的那种轻微阻力，以及'差一点点'的反复出现。",
        bodyEntryPoints: [
          "右手指尖到指根的微小启动",
          "左手掌根的下压",
          "胸腔随呼吸的轻微开合",
          "目光比手慢半秒",
        ],
        spatialRoute:
          "不离开椅面。所有空间变化都发生在椅上方 50cm 范围内。",
        stagingNotes:
          "灯亮时你已坐定，整段不离场。视线先落在自己手上，最后短暂抬向观众一次（不超过 1 秒）。",
        movementSeeds: [
          { id: "m1",
            description: "右手两根手指做一个'抽'的微小启动，启动到一半被左手轻轻按回去，整个动作不超过 3 秒。",
            bodyFocus: "右手指根与左手掌根", spaceFocus: "信封正上方", timingFocus: "慢启动 + 快制止" },
          { id: "m2",
            description: "重复 m1 三次，每一次都让停止的位置略微偏一点点，让别人几乎看不出区别。",
            bodyFocus: "右手前 1/3", spaceFocus: "信封上方微变", timingFocus: "三次递进" },
          { id: "m3",
            description: "在两次启动之间，让胸腔像被人轻轻按了一下那样下沉一指节，然后慢慢回来。",
            bodyFocus: "胸骨", spaceFocus: "原位", timingFocus: "比呼吸慢半拍" },
          { id: "m4",
            description: "眼睛先看向你的右手，但你的脸要比手慢半秒才转过去。",
            bodyFocus: "颈与眼", spaceFocus: "右手所在方向", timingFocus: "脸落后半秒" },
          { id: "m5",
            description: "在某一次启动'差一点抽出'的瞬间停住 4 秒，停住时手指内部的拉力不要松。",
            bodyFocus: "全身张力", spaceFocus: "原位", timingFocus: "4 秒静止" },
          { id: "m6",
            description: "停止结束后，让阻力像沿着一条线从指尖爬到肩胛，过程要慢到别人几乎看不到。",
            bodyFocus: "指尖—肘—肩胛通路", spaceFocus: "右臂内侧", timingFocus: "10 秒缓爬" },
        ],
        avoid: ["把信贴在心口", "把信举过头顶", "缓慢拆信", "闭眼回忆状", "戏剧性叹气"],
        musicFeeling: "低频持续 drone 贴底，没有节拍，不要被它带节奏。你比它慢一点点。",
        feedbackQuestions: [
          "哪个动作种子让你最有感觉？",
          "哪个种子最不好用？",
          "做完后身体哪个部位还在响？",
          "有没有自然冒出来、卡片上没写的动作？",
          "这一段你最想停在哪里？",
        ],
        revision,
      },
    });
  }

  // ── Stage 4 编导点评 ──
  if (user.includes("编导点评")) {
    const m = user.match(/"sectionId"\s*:\s*"([^"]+)"/);
    const sectionId = m ? m[1] : "s1";
    const isLast = user.includes("本段已是最后一段");
    const revised = user.includes("本段已修订过一次");
    const nextStep: "revise_current_section" | "move_to_next_section" | "generate_final_work" =
      isLast ? "generate_final_work" : (revised ? "move_to_next_section" : "move_to_next_section");

    return JSON.stringify({
      directorFeedback: {
        sectionId,
        revision: revised ? 1 : 0,
        retain: [
          "m1 的'启动到一半被按回去'——这是这一段的核心事件",
          "m5 的 4 秒停止——它把整段的内压交出去了",
          "m4 的视线慢半秒——给了观众一个可以停下来的入口",
        ],
        revise: [
          "m6 的'沿线爬到肩胛'太长，容易变成示范",
          "m3 的胸腔下沉太像呼吸练习，需要让它服务于 m1 而不是独立存在",
        ],
        discard: ["任何让信靠近胸口的趋势"],
        diagnosis:
          "你身体里最真实的是'启动—被制止'的那个微小循环，它现在已经能被观众看到了。继续把这个循环做小、做精确，比再加新动作有用得多。",
        concreteSuggestions: [
          "把 m6 删掉，让 m5 之后直接进入呼吸停留",
          "m3 改为：'在 m1 启动的瞬间，胸腔同时被按一下'，让两个动作叠成一个事件",
          "把视线抬向观众的时刻从段末提前到 m5 的停顿里，但只看半秒",
        ],
        revisedMovementDirection:
          "本段要做的事变得更小：只有一个'启动—被按住—停'的循环，最多重复 3 次，每次的失败位置略不同。其他动作都为这个循环服务。",
        transitionToNextSection:
          "在最后一次停顿没结束时，让肩胛非常缓慢地起一个意图，下一段从这个意图自然接上。",
        nextStep,
      },
    });
  }

  // ── Stage 5 final ──
  if (user.includes("最终作品稿")) {
    return JSON.stringify({
      finalPiece: {
        title: "未拆封的信",
        durationSec: 90,
        logline: "一个人坐在椅上想抽出一封信，每次启动都被自己按回去，直到椅子悄悄消失。",
        music: "drone 60 秒后引入单次金属敲击；75 秒静音 5 秒。",
        props: "一只木椅 + 一封未拆信。",
        stageScene: "深灰地胶，单点顶光在椅上，三面观众。",
        performerNotes:
          "不要去'演'内心，让那个'启动—被按回去'的小循环成立，整支舞就成立。",
        sections: [
          { index: 1, sectionId: "s1", name: "封口", timeRange: "0:00 - 0:20",
            sceneDescription: "灯亮时你已坐在椅上，两手夹着一封未拆的信。",
            movementDirection: "一个'启动—被按住—停'的小循环，最多重复 3 次。",
            retainedSeeds: [
              "右手两根手指做'抽'的微小启动，启动到一半被左手按回去（3 秒）",
              "重复 3 次，每次停止位置略偏",
              "在差一点抽出的瞬间停 4 秒，张力不松",
              "脸比手慢半秒看向手",
            ],
            staging: "不离场，整段只在椅上方 50cm 范围。视线在段中向观众短暂抬一次。",
            musicFeeling: "drone 贴底，你比它慢一点点。",
            props: "信夹在两手之间。",
            transitionOut: "最后一次停顿未结束时，肩胛极慢地起一个意图。",
            rehearsalReminders: ["不要把信靠近胸口", "胸腔下沉与手部启动同时发生，叠成一个事件"] },
          { index: 2, sectionId: "s2", name: "传导", timeRange: "0:20 - 0:45",
            sceneDescription: "椅上不动的环境，但你身体里有一条线开始从指尖往肩胛爬。",
            movementDirection: "把第 1 段的循环延展到上半身，下半身仍被钉。",
            retainedSeeds: [
              "阻力从指尖沿一条看不见的线缓爬到肩胛（10 秒）",
              "上身可倾斜 30 度，但脚掌不离地",
            ],
            staging: "椅上倾斜，视线落在右肩。",
            musicFeeling: "drone 加入极轻的金属泛音。",
            props: "信仍在手中。",
            transitionOut: "椅子被技术人员悄悄推走，不切光。",
            rehearsalReminders: ["不要做大幅伸展", "不要甩头"] },
          { index: 3, sectionId: "s3", name: "失去支点", timeRange: "0:45 - 1:10",
            sceneDescription: "椅子已经消失，你的身体留在它原本的位置上方。",
            movementDirection: "重心始终偏离中线 10 度以上，每次想恢复平衡都让它失败。",
            retainedSeeds: [
              "在原椅位 60cm 范围内，重心反复偏离",
              "在即将摔倒的临界点停 2 秒",
            ],
            staging: "视线盯着不存在的椅面。",
            musicFeeling: "drone 上一次金属敲击之后逐渐变薄。",
            props: "信仍在手，但不再是焦点。",
            transitionOut: "音乐静音。",
            rehearsalReminders: ["不要真的摔倒", "不要扶墙", "不要下跪"] },
          { index: 4, sectionId: "s4", name: "未拆", timeRange: "1:10 - 1:30",
            sceneDescription: "音乐没了，光收到只剩一点。",
            movementDirection: "动作消失只剩呼吸，矛盾不能消失。",
            retainedSeeds: [
              "停在最后一次失败的位置上不动",
              "信被举到与胸口同高，不贴",
              "首次直视观众一次（不超过 1 秒）",
            ],
            staging: "停在原位，与观众的距离首次成立。",
            musicFeeling: "全段静音。",
            props: "信仍未拆。",
            transitionOut: "灯暗。",
            rehearsalReminders: ["不要微笑", "不要鞠躬", "不要把信放下"] },
        ],
      },
    });
  }

  return JSON.stringify({ error: "mock fallback: unknown stage" });
}
