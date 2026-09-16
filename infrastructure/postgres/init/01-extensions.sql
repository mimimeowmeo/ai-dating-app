-- Runs once on first database initialization (empty data volume).
-- Enables the extensions the app needs. Tables are NOT created here: schema changes go through
-- Drizzle migrations (D24).

-- Geography types and distance queries, e.g. ST_DWithin for the km-radius filter (D03).
CREATE EXTENSION IF NOT EXISTS postgis;

-- vector type and similarity search for face / preference / semantic embeddings (D03, D07).
CREATE EXTENSION IF NOT EXISTS vector;
