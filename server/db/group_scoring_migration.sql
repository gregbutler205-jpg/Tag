-- Group Scoring Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Safe to run more than once — uses IF NOT EXISTS / DO blocks

-- Add score, verdict, reasoning, and scored_at columns to group_guesses
ALTER TABLE public.group_guesses
  ADD COLUMN IF NOT EXISTS score       INTEGER      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verdict     TEXT,
  ADD COLUMN IF NOT EXISTS reasoning   TEXT,
  ADD COLUMN IF NOT EXISTS scored_at   TIMESTAMPTZ;
