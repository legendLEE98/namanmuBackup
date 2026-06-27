import { loadOrbitConfig } from "@orbit/config";
import type { ReferenceExtractResponse } from "@orbit/shared";
import {
  referenceExtractResponseSchema,
  referenceExtractWorkerResponseSchema
} from "@orbit/shared";
import { BadGatewayException, Injectable } from "@nestjs/common";
import { JobsService } from "../jobs/jobs.service";

interface UploadedExtractFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class ExtractService {
  private readonly pythonWorkerUrl = loadOrbitConfig(process.env, {
    service: "api"
  }).PYTHON_WORKER_URL;

  constructor(private readonly jobsService: JobsService) {}

  async extract(
    files: UploadedExtractFile[],
    projectId: string
  ): Promise<ReferenceExtractResponse> {
    const queuedJob = await this.jobsService.create({
      projectId,
      type: "reference-extract",
      payload: { fileCount: files.length }
    });
    const runningJob =
      (await this.jobsService.update(queuedJob.jobId, {
        status: "running",
        progress: 10,
        message: "참고자료 텍스트 추출 중"
      })) ?? queuedJob;
    const form = new FormData();
    form.append("project_id", projectId);

    for (const file of files) {
      form.append(
        "files",
        new Blob([file.buffer], {
          type: file.mimetype || "application/octet-stream"
        }),
        file.originalname || "upload"
      );
    }

    const response = await fetch(
      workerUrl(this.pythonWorkerUrl, "/api/extract"),
      {
        method: "POST",
        body: form
      }
    );

    if (!response.ok) {
      const errorMessage =
        (await response.text()) || "Python worker extraction failed.";
      await this.jobsService.update(queuedJob.jobId, {
        status: "failed",
        progress: runningJob.progress,
        message: "Python worker extraction failed.",
        error: {
          code: "PYTHON_WORKER_EXTRACT_FAILED",
          message: errorMessage
        }
      });
      throw new BadGatewayException(errorMessage);
    }

    const workerPayload = referenceExtractWorkerResponseSchema.parse(
      await response.json()
    );
    const completedJob =
      (await this.jobsService.update(queuedJob.jobId, {
        status: "succeeded",
        progress: 100,
        message: "참고자료 텍스트 추출 완료",
        result: { files: workerPayload.files }
      })) ?? queuedJob;

    return referenceExtractResponseSchema.parse({
      ...workerPayload,
      job: completedJob
    });
  }
}

function workerUrl(baseUrl: string, path: string): string {
  return new URL(
    path,
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  ).toString();
}
