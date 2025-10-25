# Dashboard Template – Enhancements

This template has been upgraded with client-side JavaScript to make the UI interactive without any backend, plus a few tasteful animations.

## What’s included

- Global
  - Active sidebar highlighting
  - Header search filters visible content on each page
  - Notification bell and action buttons show toasts
  - Floating buttons (bottom-right): theme toggle (light/dark) and sidebar toggle (mobile-friendly)
  - Scroll-reveal animations, button ripple effects
- Dashboard (index.html)
  - Quick Draft form saves to localStorage
  - Latest Tasks: toggle done, delete with confirmation
  - Projects table: click headers to sort
  - Progress bars animate when visible; counters count up
- Settings
  - Site Control toggle and message persist; shows a maintenance banner across pages when off
  - General info, social usernames persist
  - Widgets Control persists and hides/shows dashboard widgets
  - Backup time and server selection persist
- Courses
  - “Course Info” opens a modal; enroll/unenroll stored; badge appears on cards
- Friends
  - Remove friend with confirmation + animation; contact icons show toasts
- Files
  - Upload button opens file picker and adds files to the grid; download icons show toasts
- Plans
  - Click “Join” to switch plan; current plan is highlighted and saved

## Usage

Just open the HTML files in your browser. No build setup is required.

- Theme: use the moon button (bottom-right) to toggle light/dark. Preference is saved.
- Mobile: use the menu button (bottom-right) to toggle the sidebar.
- Header search: type to filter visible cards, rows, and widgets on the page.

## Implementation notes

- All data is stored locally via localStorage with the key prefix `felopateer:`.
- Scripts are loaded via `js/main.js` with `defer` on every page.
- Small extra CSS for animations, toasts, modal, and dark theme lives at the end of `css/main.css`.

If you want anything tweaked (more animations, different behaviors), tell me and I’ll refine it. 🙌
