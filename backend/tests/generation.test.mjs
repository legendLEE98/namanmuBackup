import assert from "node:assert/strict";
import { createLocalPresentationDocument } from "../lib/local-generator.mjs";
import { validatePresentationDocument } from "../lib/schema.mjs";
import { generatePptxBuffer } from "../lib/pptx.mjs";

const document = createLocalPresentationDocument({
  prompt: "AI 기반 고객 지원 자동화 전략",
  audience: "제품팀과 CX 리더",
  durationMinutes: 10,
  slideCount: 5,
  tone: "persuasive",
  language: "ko",
  referenceText: "응답 시간 단축, 상담 품질 균일화, 비용 효율화가 핵심이다.",
  templateId: "clarity",
});

assert.equal(document.slides.length, 5);
assert.equal(validatePresentationDocument(document).length, 0);

for (const slide of document.slides) {
  assert.ok(slide.title);
  assert.ok(slide.speakerScript);
  assert.ok(slide.keywords.length > 0);
  assert.ok(slide.aiSuggestions.every((suggestion) => suggestion.status === "pending"));
  const objectIds = new Set(slide.objects.map((object) => object.id));
  assert.ok(slide.emphasisPoints.every((point) => objectIds.has(point.targetObjectId)));
}

const pptx = generatePptxBuffer(document);
assert.equal(pptx[0], 0x50);
assert.equal(pptx[1], 0x4b);
assert.ok(pptx.length > 5000);
assert.ok(pptx.includes(Buffer.from("[Content_Types].xml")));

console.log("generation.test.mjs passed");
