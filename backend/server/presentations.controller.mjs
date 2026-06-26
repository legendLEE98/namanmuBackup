import "reflect-metadata";
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { PresentationsService } from "./presentations.service.mjs";

class PresentationsControllerClass {
  constructor(presentationsService) {
    this.presentationsService = presentationsService;
  }

  generate(payload) {
    return this.presentationsService.generate(payload);
  }

  getPresentation(presentationId) {
    return this.presentationsService.getPresentation(presentationId);
  }

  patchPresentation(presentationId, payload) {
    return this.presentationsService.patchPresentation(presentationId, payload);
  }

  getStatus(presentationId) {
    return this.presentationsService.getStatus(presentationId);
  }

  async exportPresentation(presentationId, format, response) {
    const exportResult = await this.presentationsService.exportPresentation(presentationId, format || "pptx");
    response.writeHead(200, exportResult.headers);
    response.end(exportResult.body);
  }
}

Reflect.defineMetadata("design:paramtypes", [PresentationsService], PresentationsControllerClass);

Controller("api/presentations")(PresentationsControllerClass);

Post("generate")(PresentationsControllerClass.prototype, "generate", descriptor("generate"));
HttpCode(202)(PresentationsControllerClass.prototype, "generate", descriptor("generate"));
Body()(PresentationsControllerClass.prototype, "generate", 0);

Get(":id")(PresentationsControllerClass.prototype, "getPresentation", descriptor("getPresentation"));
Param("id")(PresentationsControllerClass.prototype, "getPresentation", 0);

Patch(":id")(PresentationsControllerClass.prototype, "patchPresentation", descriptor("patchPresentation"));
Param("id")(PresentationsControllerClass.prototype, "patchPresentation", 0);
Body()(PresentationsControllerClass.prototype, "patchPresentation", 1);

Get(":id/generation-status")(PresentationsControllerClass.prototype, "getStatus", descriptor("getStatus"));
Param("id")(PresentationsControllerClass.prototype, "getStatus", 0);

Get(":id/export")(PresentationsControllerClass.prototype, "exportPresentation", descriptor("exportPresentation"));
Header("Cache-Control", "no-store")(PresentationsControllerClass.prototype, "exportPresentation", descriptor("exportPresentation"));
Param("id")(PresentationsControllerClass.prototype, "exportPresentation", 0);
Query("format")(PresentationsControllerClass.prototype, "exportPresentation", 1);
Res()(PresentationsControllerClass.prototype, "exportPresentation", 2);

function descriptor(methodName) {
  return Object.getOwnPropertyDescriptor(PresentationsControllerClass.prototype, methodName);
}

export const PresentationsController = PresentationsControllerClass;
