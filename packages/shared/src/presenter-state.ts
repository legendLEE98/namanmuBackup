import type { DeckSlide, SlideId } from "./presentation-script";
import type { SlideKeyword } from "./slide-keyword";

export type PresentationSessionStatus = "SCHEDULED" | "LIVE" | "PAUSED" | "ENDED";
export type QuestionStatus = "NEW" | "AI_ANSWERED" | "NEEDS_PRESENTER" | "DISMISSED" | "ANSWERED_LIVE";

export interface PresenterSlideSummary {
  slideId: SlideId;
  slideNumber: number;
  title: string | null;
  thumbnailLabel: string;
}

export interface PresenterQuestion {
  questionId: string;
  slideId: SlideId | null;
  body: string;
  status: QuestionStatus;
  requiresPresenterAttention: boolean;
  createdAt: string;
}

export interface PresenterStateSummary {
  status: PresentationSessionStatus;
  currentSlide: PresenterSlideSummary;
  nextSlide: PresenterSlideSummary | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  currentKeywords: SlideKeyword[];
  missedKeywordCandidates: SlideKeyword[];
  pendingQuestions: PresenterQuestion[];
}

export function getPresenterSlideSummary(slide: DeckSlide): PresenterSlideSummary {
  return {
    slideId: slide.slideId,
    slideNumber: slide.slideNumber,
    title: slide.title,
    thumbnailLabel: slide.thumbnailLabel
  };
}

export function createPresenterStateSummary(params: {
  slides: DeckSlide[];
  currentSlideId: SlideId;
  elapsedSeconds: number;
  targetDurationSeconds: number;
  keywordsBySlideId: Record<string, SlideKeyword[]>;
  questions: PresenterQuestion[];
  status: PresentationSessionStatus;
}): PresenterStateSummary {
  const currentIndex = Math.max(
    0,
    params.slides.findIndex((slide) => slide.slideId === params.currentSlideId)
  );
  const currentSlide = params.slides[currentIndex] ?? params.slides[0];
  const nextSlide = params.slides[currentIndex + 1] ?? null;
  const currentKeywords = params.keywordsBySlideId[currentSlide.slideId] ?? [];
  const missedKeywordCandidates = currentKeywords.filter((keyword) => keyword.isRequired);
  const pendingQuestions = params.questions.filter(
    (question) => question.status === "NEW" || question.requiresPresenterAttention
  );

  return {
    status: params.status,
    currentSlide: getPresenterSlideSummary(currentSlide),
    nextSlide: nextSlide ? getPresenterSlideSummary(nextSlide) : null,
    elapsedSeconds: params.elapsedSeconds,
    remainingSeconds: Math.max(0, params.targetDurationSeconds - params.elapsedSeconds),
    currentKeywords,
    missedKeywordCandidates,
    pendingQuestions
  };
}
