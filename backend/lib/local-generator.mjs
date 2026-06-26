import { SLIDE_SIZE, assertPresentationDocument, normalizeGenerateRequest } from "./schema.mjs";

const THEMES = {
  executive: {
    id: "executive",
    name: "Executive Focus",
    background: "#f7f4ec",
    surface: "#ffffff",
    primary: "#1b365d",
    accent: "#de6b35",
    text: "#17202a",
    mutedText: "#586170",
    fontFamily: "Inter, Pretendard, Arial, sans-serif",
  },
  clarity: {
    id: "clarity",
    name: "Clarity Lab",
    background: "#eff6f3",
    surface: "#ffffff",
    primary: "#1f6f68",
    accent: "#c3423f",
    text: "#14213d",
    mutedText: "#5f6f73",
    fontFamily: "Inter, Pretendard, Arial, sans-serif",
  },
  pitch: {
    id: "pitch",
    name: "Pitch Room",
    background: "#f4f0ff",
    surface: "#fffefa",
    primary: "#42337a",
    accent: "#e0a100",
    text: "#16131f",
    mutedText: "#625d70",
    fontFamily: "Inter, Pretendard, Arial, sans-serif",
  },
};

const TONE_LABELS = {
  professional: { ko: "전문적이고 신뢰감 있게", en: "professional and credible" },
  simple: { ko: "쉽고 간결하게", en: "simple and concise" },
  persuasive: { ko: "설득력 있게", en: "persuasive and decisive" },
  educational: { ko: "학습 흐름이 보이게", en: "educational and structured" },
};

export function createLocalPresentationDocument(rawRequest) {
  const request = normalizeGenerateRequest(rawRequest);
  const now = new Date().toISOString();
  const presentationId = createId("pres");
  const theme = THEMES[request.templateId] ?? THEMES.executive;
  const language = request.language;
  const topic = makeTitle(request.prompt, language);
  const keywords = extractKeywords(`${request.prompt} ${request.referenceText ?? ""}`, language);
  const slidePlans = buildSlidePlans(request, topic, keywords);

  const slides = slidePlans.slice(0, request.slideCount).map((plan, index) => {
    const slide = buildSlide({
      request,
      plan,
      theme,
      topic,
      keywords,
      index,
      total: request.slideCount,
    });
    return slide;
  });

  const document = {
    id: presentationId,
    title: topic,
    theme,
    slides,
    createdAt: now,
    updatedAt: now,
  };

  return assertPresentationDocument(document);
}

function buildSlidePlans(request, topic, keywords) {
  const ko = request.language === "ko";
  const audience = request.audience || (ko ? "일반 청중" : "general audience");
  const tone = TONE_LABELS[request.tone]?.[request.language] ?? TONE_LABELS.professional[request.language];
  const duration = request.durationMinutes;
  const keywordText = keywords.slice(0, 4).join(", ");

  const base = [
    {
      layout: "title",
      title: topic,
      bullets: ko
        ? [`${audience}에게 맞춘 발표 초안`, `${duration}분 안에 전달할 핵심 메시지`, `${tone} 구성`]
        : [`Draft for ${audience}`, `Core message for a ${duration} minute talk`, `${tone} tone`],
      script: ko
        ? `오늘 발표는 ${topic}의 핵심을 ${audience}가 바로 이해하고 판단할 수 있도록 구성했습니다.`
        : `This talk frames ${topic} so ${audience} can understand the stakes and decide what to do next.`,
    },
    {
      layout: "problem",
      title: ko ? "왜 지금 이 주제가 중요한가" : "Why this matters now",
      bullets: ko
        ? [`현 상황의 변화와 압박 요인을 정리`, `${keywordText || "핵심 키워드"}를 중심으로 문제 정의`, "청중이 느끼는 리스크와 기대를 연결"]
        : ["Summarize current shifts and pressure", `Define the problem through ${keywordText || "key terms"}`, "Connect audience risk and expectations"],
      script: ko
        ? `먼저 이 주제가 지금 중요해진 배경을 짚습니다. 변화 요인을 명확히 해야 뒤의 제안이 설득력을 얻습니다.`
        : `Start by clarifying why the topic has become urgent. The recommendation only lands when the forces behind it are visible.`,
    },
    {
      layout: "insight",
      title: ko ? "핵심 통찰" : "Core insight",
      bullets: ko
        ? [`${topic}의 성공 조건을 한 문장으로 압축`, "데이터보다 의사결정 기준을 먼저 제시", "실행 가능한 관점으로 전환"]
        : [`Condense the success condition for ${topic}`, "Lead with decision criteria before details", "Move from analysis to action"],
      script: ko
        ? `이 슬라이드는 발표의 중심 주장입니다. 청중이 기억해야 할 문장을 먼저 제시하고, 나머지는 이를 뒷받침합니다.`
        : `This slide carries the thesis. State the sentence the audience should remember, then use the rest of the deck to support it.`,
    },
  ];

  const middleCount = Math.max(0, request.slideCount - 5);
  for (let index = 0; index < middleCount; index += 1) {
    const keyword = keywords[index % Math.max(1, keywords.length)] || (ko ? "실행" : "execution");
    const templates = [
      {
        layout: "comparison",
        title: ko ? `${keyword} 관점의 선택지 비교` : `Options through ${keyword}`,
        bullets: ko
          ? ["현재 방식의 한계", "개선안의 기대 효과", "우선순위 기준"]
          : ["Limitations of the current path", "Expected gains from the improved path", "Priority criteria"],
        script: ko
          ? `${keyword} 관점에서 가능한 선택지를 비교합니다. 단순 장단점보다 어떤 기준으로 판단할지가 중요합니다.`
          : `Compare options through ${keyword}. The main value is the decision lens, not just a pros and cons list.`,
      },
      {
        layout: "chart",
        title: ko ? `${keyword} 실행 지표` : `${keyword} execution signals`,
        bullets: ko
          ? ["영향도", "준비도", "실행 난이도"]
          : ["Impact", "Readiness", "Execution effort"],
        script: ko
          ? `이 지표는 우선순위를 잡기 위한 가상의 초안입니다. 실제 수치가 들어오면 바로 갱신할 수 있습니다.`
          : `These signals are editable placeholders for prioritization. Replace them with real numbers as evidence comes in.`,
      },
      {
        layout: "timeline",
        title: ko ? `${keyword} 로드맵` : `${keyword} roadmap`,
        bullets: ko
          ? ["1단계: 기준 정렬", "2단계: 파일럿 실행", "3단계: 확장"]
          : ["Step 1: align criteria", "Step 2: pilot", "Step 3: scale"],
        script: ko
          ? `로드맵은 빠르게 시작하되 검증을 거쳐 확장하는 순서로 설계했습니다.`
          : `The roadmap starts small, validates learning, and then scales with confidence.`,
      },
    ];
    base.push(templates[index % templates.length]);
  }

  base.push(
    {
      layout: "recommendation",
      title: ko ? "권장 실행안" : "Recommended action",
      bullets: ko
        ? ["즉시 착수할 1순위 과제", "2주 안에 확인할 증거", "의사결정자가 승인해야 할 범위"]
        : ["First priority to start now", "Evidence to confirm within two weeks", "Scope that needs approval"],
      script: ko
        ? `이제 실행안을 제안합니다. 핵심은 작게 시작하되, 다음 의사결정에 필요한 증거를 빠르게 모으는 것입니다.`
        : `Now move into the recommendation. Start small, but gather the evidence needed for the next decision quickly.`,
    },
    {
      layout: "closing",
      title: ko ? "다음 단계" : "Next steps",
      bullets: ko
        ? ["담당자와 일정 확정", "자료 보강 및 수치 검증", "최종 발표본 디자인 다듬기"]
        : ["Confirm owners and timeline", "Strengthen evidence and validate numbers", "Polish final deck design"],
      script: ko
        ? `마지막으로 다음 행동을 명확히 하며 마무리합니다. 이 초안은 편집 가능한 출발점입니다.`
        : `Close with explicit next actions. This draft is a starting point designed to be edited.`,
    },
  );

  return base;
}

function buildSlide({ request, plan, theme, topic, keywords, index, total }) {
  const slideId = createId("slide");
  const accent = index % 2 === 0 ? theme.accent : theme.primary;
  const titleObjectId = createId("obj");
  const bodyObjectId = createId("obj");
  const objects = [
    {
      id: createId("obj"),
      type: "shape",
      x: 0,
      y: 0,
      width: SLIDE_SIZE.width,
      height: SLIDE_SIZE.height,
      rotation: 0,
      style: { shape: "rect", fill: theme.background, stroke: "transparent", opacity: 1 },
    },
    {
      id: createId("obj"),
      type: "shape",
      x: 52,
      y: 46,
      width: 108,
      height: 10,
      rotation: 0,
      style: { shape: "roundRect", fill: accent, stroke: "transparent", radius: 10 },
    },
    {
      id: titleObjectId,
      type: "text",
      x: plan.layout === "title" ? 82 : 72,
      y: plan.layout === "title" ? 116 : 72,
      width: plan.layout === "title" ? 850 : 760,
      height: plan.layout === "title" ? 150 : 88,
      rotation: 0,
      style: {
        fill: theme.text,
        fontSize: plan.layout === "title" ? 58 : 42,
        fontWeight: 800,
        align: "left",
        lineHeight: 1.08,
      },
      content: plan.title,
    },
    {
      id: bodyObjectId,
      type: "text",
      x: 82,
      y: plan.layout === "title" ? 316 : 184,
      width: plan.layout === "title" ? 680 : 580,
      height: plan.layout === "title" ? 220 : 270,
      rotation: 0,
      style: {
        fill: theme.text,
        fontSize: 28,
        fontWeight: 500,
        align: "left",
        lineHeight: 1.35,
        bullet: true,
      },
      content: plan.bullets.map((bullet) => `• ${bullet}`).join("\n"),
    },
    {
      id: createId("obj"),
      type: "text",
      x: 82,
      y: 636,
      width: 420,
      height: 32,
      rotation: 0,
      style: { fill: theme.mutedText, fontSize: 18, fontWeight: 600, align: "left", letterSpacing: 0 },
      content: `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
    },
  ];

  if (plan.layout === "title") {
    objects.push(heroPanel(theme, accent, topic, keywords));
  } else if (plan.layout === "chart") {
    const chartId = createId("obj");
    objects.push({
      id: chartId,
      type: "chart",
      x: 720,
      y: 158,
      width: 430,
      height: 330,
      rotation: 0,
      style: { fill: theme.surface, stroke: "#d7dee8", barColor: accent, text: theme.text, radius: 20 },
      chartSpec: {
        chartType: "bar",
        title: plan.title,
        labels: plan.bullets.slice(0, 3),
        values: buildChartValues(index),
        unit: "%",
      },
    });
  } else if (plan.layout === "timeline") {
    objects.push(timelineObject(theme, accent, plan.bullets));
  } else if (plan.layout === "comparison") {
    objects.push(comparisonObject(theme, accent, plan.bullets));
  } else {
    objects.push(summaryObject(theme, accent, keywords, request.language));
  }

  return {
    id: slideId,
    title: plan.title,
    objects,
    speakerScript: plan.script,
    keywords: mergeKeywords(plan.bullets, keywords).slice(0, 6),
    emphasisPoints: [
      {
        id: createId("emp"),
        targetObjectId: titleObjectId,
        type: "spotlight",
        triggerKeywords: mergeKeywords([plan.title], keywords).slice(0, 3),
        description: request.language === "ko" ? "슬라이드 제목을 먼저 강조합니다." : "Open by spotlighting the slide title.",
      },
      {
        id: createId("emp"),
        targetObjectId: bodyObjectId,
        type: "highlight",
        triggerKeywords: mergeKeywords(plan.bullets, keywords).slice(0, 3),
        description: request.language === "ko" ? "핵심 bullet을 말할 때 본문 영역을 강조합니다." : "Highlight the body when introducing the main bullets.",
      },
    ],
    aiSuggestions: [
      {
        id: createId("sug"),
        status: "pending",
        reason: request.language === "ko" ? "발표 흐름에 맞춰 강조 색상을 더 선명하게 조정" : "Make the emphasis color clearer for the talk flow",
        patches: [
          {
            op: "replace",
            path: `/slides/${index}/objects/1/style/fill`,
            value: accent === theme.accent ? theme.primary : theme.accent,
          },
        ],
      },
    ],
  };
}

function heroPanel(theme, accent, topic, keywords) {
  return {
    id: createId("obj"),
    type: "shape",
    x: 805,
    y: 118,
    width: 332,
    height: 422,
    rotation: -2,
    style: {
      shape: "roundRect",
      fill: theme.surface,
      stroke: "#d8dde7",
      radius: 28,
      label: `${keywords.slice(0, 3).join(" / ") || topic}`,
      labelColor: theme.text,
      labelSize: 26,
      accent,
    },
  };
}

function timelineObject(theme, accent, bullets) {
  return {
    id: createId("obj"),
    type: "shape",
    x: 704,
    y: 164,
    width: 440,
    height: 310,
    rotation: 0,
    style: {
      shape: "timeline",
      fill: theme.surface,
      stroke: "#d7dee8",
      radius: 18,
      accent,
      text: theme.text,
      items: bullets.join("|"),
    },
  };
}

function comparisonObject(theme, accent, bullets) {
  return {
    id: createId("obj"),
    type: "shape",
    x: 700,
    y: 158,
    width: 452,
    height: 330,
    rotation: 0,
    style: {
      shape: "comparison",
      fill: theme.surface,
      stroke: "#d7dee8",
      radius: 20,
      accent,
      text: theme.text,
      items: bullets.join("|"),
    },
  };
}

function summaryObject(theme, accent, keywords, language) {
  return {
    id: createId("obj"),
    type: "shape",
    x: 704,
    y: 158,
    width: 438,
    height: 328,
    rotation: 0,
    style: {
      shape: "summary",
      fill: theme.surface,
      stroke: "#d7dee8",
      radius: 22,
      accent,
      text: theme.text,
      label: language === "ko" ? "핵심 메시지" : "Core message",
      items: keywords.slice(0, 4).join("|"),
    },
  };
}

function buildChartValues(index) {
  return [62 + (index % 3) * 7, 48 + (index % 4) * 8, 35 + (index % 5) * 6];
}

function makeTitle(prompt, language) {
  const cleaned = prompt
    .replace(/\s+/g, " ")
    .replace(/[.?!]+$/g, "")
    .trim();
  if (!cleaned) {
    return language === "ko" ? "새 발표자료" : "New presentation";
  }
  const limit = language === "ko" ? 28 : 54;
  return cleaned.length > limit ? `${cleaned.slice(0, limit).trim()}...` : cleaned;
}

function extractKeywords(text, language) {
  const stopWords = new Set(
    language === "ko"
      ? ["그리고", "하지만", "있는", "없는", "위한", "대한", "으로", "에서", "에게", "하는", "한다", "발표", "자료"]
      : ["about", "with", "from", "that", "this", "into", "presentation", "deck", "slides", "should", "would"],
  );
  const matches = String(text)
    .toLowerCase()
    .match(/[a-z0-9가-힣]{2,}/g) ?? [];
  const counts = new Map();
  matches.forEach((word) => {
    if (stopWords.has(word)) {
      return;
    }
    counts.set(word, (counts.get(word) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 10)
    .map(([word]) => word);
}

function mergeKeywords(values, existing) {
  const candidates = [...existing, ...extractKeywords(values.join(" "), "ko")];
  return [...new Set(candidates)].filter(Boolean);
}

function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}
