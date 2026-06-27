import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FilesModule } from "./files/files.module";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { databaseOptions } from "./database/data-source";
import { ExtractModule } from "./extract/extract.module";
import { ProjectsModule } from "./projects/projects.module";
import { RealtimeGateway } from "./realtime/realtime.gateway";

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseOptions),
    HealthModule,
    ProjectsModule,
    FilesModule,
    ExtractModule,
    JobsModule
  ],
  providers: [RealtimeGateway]
})
export class AppModule {}
