import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/core";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}
