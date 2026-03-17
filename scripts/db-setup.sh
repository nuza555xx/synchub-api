#!/bin/bash
set -e

echo "═══════════════════════════════════════════"
echo "  SyncHub — Supabase Database Setup"
echo "═══════════════════════════════════════════"
echo ""

# 1. Login
echo "▶ Step 1: Supabase Login"
npx supabase login
echo ""

# 2. Link to remote project
echo "▶ Step 2: Link to Supabase project"
read -p "Enter your Supabase project ref (e.g. abcdefghijklmnop): " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
  echo "Error: Project ref is required."
  exit 1
fi

npx supabase link --project-ref "$PROJECT_REF"
echo ""

# 3. Push migrations
echo "▶ Step 3: Push migrations to remote database"
npx supabase db push
echo ""

echo "✅ Done! Database is set up and migrations applied."
