import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY required"),
  PORT: z.coerce.number().int().positive().default(3001),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:3001"),
  SCOUT_CONFIG_REPO: z
    .string()
    .default("https://github.com/benikigai/timbre-scout-config.git"),
  PUBLIC_BASE_URL: z.string().default("http://localhost:3001"),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  console.error("env validation failed:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const allowedOrigins = env.ALLOWED_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
