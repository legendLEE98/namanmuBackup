import { createLocalPresentationDocument } from "./local-generator.mjs";
import { assertPresentationDocument, normalizeGenerateRequest, presentationDocumentSchema, SLIDE_SIZE } from "./schema.mjs";

export async function generatePresentationDocument(rawRequest) {
  const request = normalizeGenerateRequest(rawRequest);
  if (process.env.AI_GENERATION_MODE !== "openai" || !process.env.OPENAI_API_KEY) {
    return {
      source: "local",
      document: createLocalPresentationDocument(request),
    };
  }

  const document = await generateWithOpenAI(request);
  return {
    source: "openai",
    document,
  };
}

async function generateWithOpenAI(request) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Create an editable presentation draft as JSON only.",
                "The document must follow the provided schema exactly.",
                `Slides are rendered on a ${SLIDE_SIZE.width}x${SLIDE_SIZE.height} canvas.`,
                "Each slide must include text objects, speakerScript, keywords, emphasisPoints that reference object ids, and pending aiSuggestions.",
                "Use chartSpec for chart objects instead of raster chart images.",
              ].join("\n"),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                task: "Generate an editable presentation draft.",
                request,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "presentation_document",
          strict: true,
          schema: presentationDocumentSchema,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed with ${response.status}`;
    throw new Error(message);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI response did not include output_text content");
  }

  let document;
  try {
    document = JSON.parse(outputText);
  } catch (error) {
    throw new Error(`OpenAI response was not valid JSON: ${error.message}`);
  }

  const now = new Date().toISOString();
  document.updatedAt = document.updatedAt || now;
  document.createdAt = document.createdAt || now;
  return assertPresentationDocument(document);
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }
  const chunks = [];
  for (const item of payload?.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("").trim();
}
