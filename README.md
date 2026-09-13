# To-Do Manager v2 — Supabase

Cloud-backed To-Do Manager using the existing Checklist Manager Supabase project.

## Setup
1. In Supabase SQL Editor, run `supabase-tasks.sql`.
2. In Supabase Auth URL Configuration, add `https://whenry2-git.github.io/todo-manager/` as a Site URL/redirect URL.
3. Upload `index.html`, `app.js`, `config.js`, and `style.css` to the GitHub Pages repository.

The same Supabase Auth account can be used by Checklist Manager and To-Do Manager.

The browser uses the Supabase publishable key. That key is safe to expose in a browser; Row Level Security protects the data. Never put a secret/service-role key in GitHub.

The task time field uses 0 for less than 30 minutes, then 0.5-hour increments.
