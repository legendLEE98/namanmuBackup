import { Module } from "@nestjs/common";
import { PresentationsController } from "./presentations.controller.mjs";
import { PresentationsService } from "./presentations.service.mjs";

class AppModuleClass {}

Module({
  controllers: [PresentationsController],
  providers: [PresentationsService],
})(AppModuleClass);

export const AppModule = AppModuleClass;
