import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

const client = postgres(env.DATABASE_URL, {
  max: 10,
  ssl: "require"
});

export const db = drizzle(client, { schema });

export async function closeDb() {
  await client.end();
}
