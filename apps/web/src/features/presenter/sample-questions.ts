import type { PresenterQuestion } from "@ai-ppt/shared";

export const DEMO_QUESTIONS: PresenterQuestion[] = [
  {
    questionId: "question-1",
    slideId: "slide-1",
    body: "기존 발표 도구와 가장 크게 다른 점은 무엇인가요?",
    status: "NEW",
    requiresPresenterAttention: true,
    createdAt: "2026-06-22T00:05:00.000Z"
  },
  {
    questionId: "question-2",
    slideId: "slide-2",
    body: "리허설 데이터는 발표 후에도 계속 누적되나요?",
    status: "NEEDS_PRESENTER",
    requiresPresenterAttention: true,
    createdAt: "2026-06-22T00:07:00.000Z"
  },
  {
    questionId: "question-3",
    slideId: "slide-3",
    body: "AI 답변의 근거는 청중에게 어떻게 표시되나요?",
    status: "AI_ANSWERED",
    requiresPresenterAttention: false,
    createdAt: "2026-06-22T00:09:00.000Z"
  }
];
