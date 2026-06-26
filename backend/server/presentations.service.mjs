import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { generatePresentationDocument } from "../lib/openai-generator.mjs";
import { assertPresentationDocument, normalizeGenerateRequest } from "../lib/schema.mjs";
import { generatePptxBuffer } from "../lib/pptx.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data", "presentations");

class PresentationsServiceClass {
  presentations = new Map();
  statuses = new Map();
  isReady = false;

  async onModuleInit() {
    await fs.mkdir(dataDir, { recursive: true });
    await this.loadPresentations();
    this.isReady = true;
  }

  generate(rawPayload) {
    let payload;
    try {
      payload = normalizeGenerateRequest(rawPayload);
    } catch (error) {
      throw new HttpException({ error: error.message }, HttpStatus.BAD_REQUEST);
    }

    const presentationId = createId("job");
    this.statuses.set(presentationId, {
      status: "queued",
      step: "queued",
      progress: 0,
    });

    void this.runGeneration(presentationId, payload);
    return {
      presentationId,
      status: "queued",
    };
  }

  async runGeneration(presentationId, payload) {
    try {
      this.setStatus(presentationId, "generating", "planning", 18);
      await delay(120);
      this.setStatus(presentationId, "generating", "writing-slides", 46);
      await delay(120);
      this.setStatus(presentationId, "generating", "composing-visuals", 72);
      const { document, source } = await generatePresentationDocument(payload);
      document.id = presentationId;
      document.updatedAt = new Date().toISOString();
      this.setStatus(presentationId, "generating", "saving", 92);
      await this.savePresentation(document);
      this.presentations.set(presentationId, document);
      this.setStatus(presentationId, "completed", source === "openai" ? "completed-openai" : "completed-local", 100);
    } catch (error) {
      this.statuses.set(presentationId, {
        status: "failed",
        step: "failed",
        progress: 100,
        errorMessage: error.message,
      });
    }
  }

  async getPresentation(presentationId) {
    const document = this.presentations.get(presentationId) || await this.readPresentation(presentationId);
    if (!document) {
      throw notFound("Presentation not found");
    }
    return document;
  }

  async patchPresentation(presentationId, payload) {
    let document;
    try {
      document = assertPresentationDocument({
        ...payload,
        id: presentationId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new HttpException({ error: error.message }, HttpStatus.BAD_REQUEST);
    }

    await this.savePresentation(document);
    this.presentations.set(presentationId, document);
    this.statuses.set(presentationId, {
      status: "completed",
      step: "saved",
      progress: 100,
    });
    return document;
  }

  getStatus(presentationId) {
    const status = this.statuses.get(presentationId);
    if (!status) {
      throw notFound("Generation status not found");
    }
    return status;
  }

  async exportPresentation(presentationId, format) {
    const document = this.presentations.get(presentationId) || await this.readPresentation(presentationId);
    if (!document) {
      throw notFound("Presentation not found");
    }

    if (format === "json") {
      const body = Buffer.from(JSON.stringify(document, null, 2), "utf8");
      return {
        body,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": body.length,
          "Content-Disposition": safeAttachment(`${document.title || "presentation"}.json`),
        },
      };
    }

    if (format !== "pptx") {
      throw new HttpException({ error: "Unsupported export format" }, HttpStatus.BAD_REQUEST);
    }

    const body = generatePptxBuffer(document);
    return {
      body,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Length": body.length,
        "Content-Disposition": safeAttachment(`${document.title || "presentation"}.pptx`),
      },
    };
  }

  async savePresentation(document) {
    await fs.writeFile(path.join(dataDir, `${document.id}.json`), JSON.stringify(document, null, 2), "utf8");
  }

  async readPresentation(presentationId) {
    try {
      const text = await fs.readFile(path.join(dataDir, `${presentationId}.json`), "utf8");
      const document = assertPresentationDocument(JSON.parse(text));
      this.presentations.set(presentationId, document);
      this.statuses.set(presentationId, {
        status: "completed",
        step: "loaded",
        progress: 100,
      });
      return document;
    } catch {
      return null;
    }
  }

  async loadPresentations() {
    const files = await fs.readdir(dataDir).catch(() => []);
    await Promise.all(files.filter((file) => file.endsWith(".json")).map(async (file) => {
      const presentationId = file.replace(/\.json$/, "");
      await this.readPresentation(presentationId);
    }));
  }

  setStatus(presentationId, status, step, progress) {
    this.statuses.set(presentationId, {
      status,
      step,
      progress,
    });
  }
}

Injectable()(PresentationsServiceClass);

function notFound(message) {
  return new HttpException({ error: message }, HttpStatus.NOT_FOUND);
}

function safeAttachment(filename) {
  const cleaned = filename.replace(/[\\/:*?"<>|]+/g, "_");
  return `attachment; filename*=UTF-8''${encodeURIComponent(cleaned)}`;
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const PresentationsService = PresentationsServiceClass;
