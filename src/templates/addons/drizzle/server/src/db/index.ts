import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL in server/.env before starting the server.");

export const sql = postgres(databaseUrl);
export const db = drizzle(sql, { schema });
