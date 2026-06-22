import { useEffect, useMemo, useState } from "react";
import { createPresenterStateSummary, type DeckSlide, type SlideKeyword } from "@ai-ppt/shared";
import { DEMO_QUESTIONS } from "./sample-questions";

interface PresenterViewProps {
  slides: DeckSlide[];
  keywordsBySlideId: Record<string, SlideKeyword[]>;
}

const TARGET_DURATION_SECONDS = 900;

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PresenterView({ slides, keywordsBySlideId }: PresenterViewProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const currentSlide = slides[currentSlideIndex] ?? slides[0];

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isRunning]);

  const presenterState = useMemo(
    () =>
      createPresenterStateSummary({
        slides,
        currentSlideId: currentSlide.slideId,
        elapsedSeconds,
        targetDurationSeconds: TARGET_DURATION_SECONDS,
        keywordsBySlideId,
        questions: DEMO_QUESTIONS,
        status: isRunning ? "LIVE" : "PAUSED"
      }),
    [currentSlide.slideId, elapsedSeconds, isRunning, keywordsBySlideId, slides]
  );

  function moveSlide(offset: number): void {
    setCurrentSlideIndex((index) => Math.min(slides.length - 1, Math.max(0, index + offset)));
  }

  return (
    <section className="presenter-view" aria-label="발표자 보조 화면">
      <header className="presenter-topbar">
        <div>
          <p>{presenterState.status === "LIVE" ? "진행 중" : "대기"}</p>
          <h1>발표자 보조 화면</h1>
        </div>
        <div className="timer-cluster" aria-label="발표 시간">
          <span>경과 {formatTimer(presenterState.elapsedSeconds)}</span>
          <strong>{formatTimer(presenterState.remainingSeconds)}</strong>
          <button type="button" onClick={() => setIsRunning((running) => !running)}>
            {isRunning ? "일시정지" : "시작"}
          </button>
        </div>
      </header>

      <div className="presenter-grid">
        <section className="current-slide-panel" aria-label="현재 슬라이드">
          <div className="presenter-panel-heading">
            <span>현재 슬라이드</span>
            <strong>
              {presenterState.currentSlide.slideNumber}/{slides.length}
            </strong>
          </div>
          <div className="presenter-canvas">
            <span>{presenterState.currentSlide.thumbnailLabel}</span>
            <h2>{presenterState.currentSlide.title}</h2>
            <p>{presenterState.currentKeywords.map((keyword) => keyword.text).join(" · ") || "핵심 키워드 없음"}</p>
          </div>
          <div className="slide-controls">
            <button type="button" onClick={() => moveSlide(-1)} disabled={currentSlideIndex === 0}>
              이전
            </button>
            <button type="button" onClick={() => moveSlide(1)} disabled={currentSlideIndex === slides.length - 1}>
              다음
            </button>
          </div>
        </section>

        <aside className="presenter-side">
          <section className="next-slide-panel" aria-label="다음 슬라이드">
            <div className="presenter-panel-heading">
              <span>다음 슬라이드</span>
            </div>
            {presenterState.nextSlide ? (
              <div className="next-slide-preview">
                <span>{presenterState.nextSlide.thumbnailLabel}</span>
                <strong>{presenterState.nextSlide.title}</strong>
              </div>
            ) : (
              <div className="presenter-empty">마지막 슬라이드입니다.</div>
            )}
          </section>

          <section className="missed-keyword-panel" aria-label="누락 키워드">
            <div className="presenter-panel-heading">
              <span>누락 키워드</span>
              <strong>{presenterState.missedKeywordCandidates.length}</strong>
            </div>
            {presenterState.missedKeywordCandidates.length > 0 ? (
              <ul className="presenter-chip-list">
                {presenterState.missedKeywordCandidates.map((keyword) => (
                  <li key={keyword.keywordId}>{keyword.text}</li>
                ))}
              </ul>
            ) : (
              <div className="presenter-empty">확인할 필수 키워드가 없습니다.</div>
            )}
          </section>

          <section className="question-panel" aria-label="질문 목록">
            <div className="presenter-panel-heading">
              <span>질문 목록</span>
              <strong>{presenterState.pendingQuestions.length}</strong>
            </div>
            <ul className="question-list">
              {presenterState.pendingQuestions.map((question) => (
                <li key={question.questionId}>
                  <span>{question.status === "NEW" ? "새 질문" : "답변 필요"}</span>
                  <p>{question.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
