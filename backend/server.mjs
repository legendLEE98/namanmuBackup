import "reflect-metadata";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./server/app.module.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.join(__dirname, "..", "frontend");
const distDir = path.join(frontendDir, "dist");
const publicDir = path.join(frontendDir, "public");

const app = await NestFactory.create(AppModule, { bodyParser: true });

for (const rootPath of [distDir, publicDir]) {
  app.useStaticAssets(rootPath, {
    index: "index.html",
    setHeaders(response) {
      response.setHeader("Cache-Control", "no-store");
    },
  });
}

const port = Number(process.env.PORT || 5173);
await app.listen(port);

console.log(`Prompt Presentation Studio running at http://localhost:${port}`);
if (process.env.AI_GENERATION_MODE !== "openai" || !process.env.OPENAI_API_KEY) {
  console.log("Using the local structured draft generator. Set AI_GENERATION_MODE=openai with OPENAI_API_KEY to use OpenAI.");
}
