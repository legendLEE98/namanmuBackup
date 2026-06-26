import fs from "node:fs";

const requiredKeys = [
  "NODE_ENV",
  "APP_ENV",
  "WEB_ORIGIN",
  "API_BASE_URL",
  "DATABASE_URL",
  "REDIS_URL",
  "STORAGE_DRIVER",
  "S3_BUCKET",
  "JOB_QUEUE_DRIVER",
  "STT_PROVIDER",
  "OCR_PROVIDER",
  "LLM_PROVIDER",
  "OPENAI_MODEL",
  "OPENAI_EMBEDDING_MODEL",
  "AWS_REGION",
  "DEMO_USER_ID",
  "DEMO_WORKSPACE_ID",
  "DEMO_PROJECT_ID",
  "DEMO_DECK_ID",
  "DEMO_SESSION_ID"
];

const content = fs.readFileSync(".env.example", "utf8");
const keys = new Set(
  content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0])
);

const missing = requiredKeys.filter((key) => !keys.has(key));

if (missing.length > 0) {
  console.error(`Missing env keys: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(".env.example contains required ORBIT keys");

