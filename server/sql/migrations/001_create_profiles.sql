-- Migration: 001_create_profiles
-- Creates the Profiles table and supporting index.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS Profiles (
    id          TEXT     NOT NULL PRIMARY KEY,
    name        TEXT     NOT NULL,
    position    TEXT     NOT NULL,
    email       TEXT     NOT NULL UNIQUE,
    phone       TEXT,
    photo_path  TEXT     NOT NULL,
    created_at  TEXT     NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT     NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS IX_Profiles_Name ON Profiles (name);
