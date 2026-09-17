# To-Do Manager v2 — Supabase

Cloud-backed To-Do Manager using the existing Checklist Manager Supabase project.

## Setup
1. In Supabase SQL Editor, run `supabase-tasks.sql`.
2. In Supabase Auth URL Configuration, add `https://whenry2-git.github.io/todo-manager/` as a Site URL/redirect URL.
3. Upload `index.html`, `app.js`, `config.js`, and `style.css` to the GitHub Pages repository.

The same Supabase Auth account can be used by Checklist Manager and To-Do Manager.

The browser uses the Supabase publishable key. That key is safe to expose in a browser; Row Level Security protects the data. Never put a secret/service-role key in GitHub.

The task time field uses 0 for less than 30 minutes, then 0.5-hour increments.


## v2.4.1 — Today's Focus

Run `supabase-tasks.sql` in Supabase SQL Editor. It safely adds the `today` column and index to the existing `tasks` table. Realtime is not re-added because it is already enabled for `tasks`.


## v2.4
- Add-task defaults: Work + 30 minutes; Personal + 30 minutes when the Personal tab is selected.
- Task row order: Complete, Due date, Task, Priority, Type, Time, Today, Actions.


## v2.4 — Completed statistics
Completed view hides Add Task and Today's Focus, shows task totals and priority charts, and keeps the completed task list at the bottom.
