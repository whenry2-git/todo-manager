# To-Do Manager v1

A lightweight to-do manager built in the same spirit as the existing
`whenry2-git/checklist-manager` project: plain HTML, CSS and JavaScript with
no build step or dependencies.

## Included

- Personal and Work tasks
- Priority 1–5
- Time estimate starting at `<30 min`, then 30-minute increments
- Optional due date
- Optional notes
- Complete / reopen tasks
- Edit and delete tasks
- Filters: All, Personal, Work, Completed
- Search
- Sorting by priority, due date, time, recently added, or title
- Local persistence using `localStorage`
- Responsive layout

## Run locally

Open `index.html` in a browser.

For a local web server, for example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

This is a static site, so it can be deployed directly with GitHub Pages.

## Data model

Each task is stored as:

```js
{
  id,
  title,
  notes,
  type: "personal" | "work",
  priority: 1 | 2 | 3 | 4 | 5,
  time: 0 | 0.5 | 1 | 1.5 | ...,
  dueDate,
  completed,
  createdAt,
  completedAt
}
```

## Shared infrastructure

Version 1 deliberately keeps persistence local, matching the current
Checklist Manager's browser-local approach. The storage boundary is isolated
behind `loadState()` / `save()` so a future shared authentication and cloud
sync layer can replace localStorage without changing the task UI/data model.

The intended future setup is:

- one account/login
- Checklist Manager data
- To-Do Manager data
- shared cloud backend
- sync across devices

No credentials or backend secrets are included in this repository.
