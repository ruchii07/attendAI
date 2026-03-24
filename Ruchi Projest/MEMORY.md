# Agent Memory — Supabase Bug Fixes

## Project Type
Multi-page HTML project with Supabase backend.
Auth is handled via Supabase client SDK (CDN).
Tables involved: teachers, students, attendance

## Your 3 Jobs — Fix These Bugs Only
BUG 1 → teacher-register.html: after signup, redirect to login page
BUG 2 → Login: if user deleted from Supabase DB, show "User not found"
         error message instead of silently failing or crashing
BUG 3 → Student login: registered students can't login to dashboard

## Hard Rules
- DO NOT change Supabase project URL or anon key
- DO NOT change face-api model loading or descriptor logic
- DO NOT remove or rename any HTML element IDs used by other scripts
- DO NOT use alert() anywhere — always use inline error divs
- Output every modified file COMPLETELY

## File Checklist
[ ] MEMORY.md
[ ] teacher-register.html — fix post-signup redirect to login
[ ] index.html (or login page) — fix BUG 2 error message + BUG 3 student login
[ ] Any shared auth JS file if it exists
