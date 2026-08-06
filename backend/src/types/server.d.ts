import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export interface Migration {
  description: string;
  sql: string[];
}

export type Db = BunSQLiteDatabase<typeof schema>;

export type DbTimestamps = {
  created: string;
  updated: string;
};

export interface Tracker {
  lastBackup: string | null;
}

export interface ModelConfig {
  id: string;
  label: string;
  file: string;
  camera: {
    position: [number, number, number];
    fov: number;
  };
  model: {
    scale: number;
    position: [number, number, number];
    rotation: [number, number, number];
  };
  dead: {
    rotation: [number, number, number];
    position: [number, number, number];
  };
}
