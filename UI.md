# UI.md — CRM Design System & UI Implementation Guide

> **Audience:** the coding CLI / AI agent implementing the frontend.
> **Stack:** React.js (SPA) · Node.js backend · MySQL (backend does not matter for this file).
> **Goal:** a clean, calm, minimal CRM interface in the style of ChatGPT — neutral grays (not blue-black), thin borders, generous spacing, rounded corners, almost no shadows, one restrained accent. The CRM **already has light and dark mode**; this document **restyles both**, with special focus on making **dark mode look like ChatGPT dark**.

---

## 0. Instructions for the CLI (READ FIRST)

1. **Do not rewrite the app from scratch.** Inspect the existing theme setup (light/dark toggle, CSS files, Tailwind config, styled-components, MUI theme, etc.) and **adapt it** to this spec.
2. **All colors must come from design tokens (CSS variables).** Never hardcode hex values inside components. If you find hardcoded colors in existing components, replace them with tokens.
3. Implement tokens in **one file** (`src/styles/tokens.css` or equivalent) and import it once at the app root.
4. Keep the **existing theme switch mechanism**. If none is reliable, use `data-theme="light|dark"` on `<html>` (details in §2).
5. Build **shared primitives first** (Button, Input, Card, Modal, Dropdown, Table, Badge, Tabs, Tooltip, Toast, Skeleton, EmptyState), then restyle screens using them.
6. Work in this order: **tokens → app shell (sidebar/topbar) → primitives → list/table pages → record pages → kanban → dashboard → AI Copilot chat → admin/settings**. Commit after each step.
7. After each step, verify **both light and dark mode**, and keyboard focus visibility.
8. Do not add heavy new dependencies. Allowed if missing: `lucide-react` (icons), `clsx`, `@radix-ui/*` (accessible primitives), `sonner` (toasts), `cmdk` (command palette), `@tanstack/react-table`, `@dnd-kit/*` (kanban), `recharts` (charts).
9. Values in this file are **ChatGPT-inspired approximations**, not official brand assets. Use them as-is; do not copy any logos or trademarks.

---

## 1. Design Principles

| Principle | Meaning |
|---|---|
| **Calm & neutral** | Backgrounds are pure neutral grays. No blue/purple tinted dark backgrounds. |
| **Content first** | Chrome (sidebar, headers) recedes; data and conversations are the focus. |
| **Borders over shadows** | Separate surfaces with 1px subtle borders. Shadows only on floating layers (menus, modals). |
| **Rounded & soft** | Large radii (12–24px) on inputs, cards, and modals. Pill shapes for chips and the chat composer. |
| **One accent** | Primary actions are **high-contrast neutral** (white button in dark, black button in light). Brand green is used sparingly for success/AI highlights. |
| **Consistent record pages** | Every object (Contact, Deal, Custom Object) uses the same layout: header + tabs + timeline. |
| **Dense but breathable** | CRM tables are data-heavy: compact rows (40px) but with clear hover/selection states. |

---

## 2. Theming Mechanism

```html
<html data-theme="dark">   <!-- or "light" -->
```

- Theme values: `light`, `dark`, `system`.
- `system` follows `prefers-color-scheme` and updates live on change.
- Persist choice in `localStorage` key `crm-theme` (wrap in try/catch).
- **Prevent flash of wrong theme:** add a tiny inline script in `index.html` `<head>` that sets `data-theme` before React mounts.
- Add `color-scheme: light` / `color-scheme: dark` in the matching theme block so native scrollbars and form controls match.
- Add `transition: background-color .15s ease, border-color .15s ease, color .15s ease` only on `body` and major surfaces — **not** on `*` (performance).

```js
// index.html inline script
(function () {
  try {
    var t = localStorage.getItem('crm-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();
```

---

## 3. Design Tokens (CSS Variables)

Create `tokens.css`. **This is the source of truth.**

### 3.1 Dark theme (ChatGPT-style) — primary focus

```css
:root[data-theme="dark"] {
  color-scheme: dark;

  /* Surfaces */
  --bg-app:            #212121;   /* main canvas (chat / content area) */
  --bg-sidebar:        #171717;   /* left sidebar, darker than canvas */
  --bg-surface:        #212121;   /* default page surface */
  --bg-surface-raised: #2f2f2f;   /* inputs, composer, cards, user bubble */
  --bg-surface-sunken: #181818;   /* code blocks, inset areas */
  --bg-elevated:       #2a2a2a;   /* menus, popovers, dropdowns */
  --bg-modal:          #2a2a2a;   /* dialogs */
  --bg-overlay:        rgba(0, 0, 0, 0.6); /* modal backdrop */

  /* Interactive surfaces */
  --bg-hover:          rgba(255, 255, 255, 0.06);
  --bg-active:         rgba(255, 255, 255, 0.10);
  --bg-selected:       #2f2f2f;   /* selected sidebar item / table row */
  --bg-input:          #2f2f2f;
  --bg-input-hover:    #343434;

  /* Text */
  --text-primary:      #ececec;
  --text-secondary:    #b4b4b4;
  --text-tertiary:     #8e8e8e;
  --text-disabled:     #676767;
  --text-inverse:      #0d0d0d;   /* text on white buttons */
  --text-link:         #7ab7ff;

  /* Borders */
  --border-subtle:     rgba(255, 255, 255, 0.08);
  --border-default:    rgba(255, 255, 255, 0.12);
  --border-strong:     rgba(255, 255, 255, 0.20);
  --border-focus:      rgba(255, 255, 255, 0.45);

  /* Primary action = neutral high-contrast (like ChatGPT send button) */
  --btn-primary-bg:        #ffffff;
  --btn-primary-bg-hover:  #e5e5e5;
  --btn-primary-text:      #0d0d0d;
  --btn-secondary-bg:      transparent;
  --btn-secondary-bg-hover: rgba(255, 255, 255, 0.06);
  --btn-secondary-border:  rgba(255, 255, 255, 0.15);

  /* Brand / accent (use sparingly: AI badge, success, active toggles) */
  --accent:            #10a37f;
  --accent-hover:      #1ab98f;
  --accent-soft:       rgba(16, 163, 127, 0.15);
  --accent-text:       #34d3a8;

  /* Semantic */
  --success:           #34c77b;  --success-soft: rgba(52, 199, 123, 0.14);
  --warning:           #f5a524;  --warning-soft: rgba(245, 165, 36, 0.14);
  --danger:            #f0524d;  --danger-soft:  rgba(240, 82, 77, 0.14);
  --info:              #5aa9ff;  --info-soft:    rgba(90, 169, 255, 0.14);

  /* Shadows (subtle; borders do most of the work) */
  --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.30);
  --shadow-md:  0 4px 16px rgba(0, 0, 0, 0.35);
  --shadow-lg:  0 12px 40px rgba(0, 0, 0, 0.50);

  /* Scrollbar */
  --scrollbar-thumb:       rgba(255, 255, 255, 0.18);
  --scrollbar-thumb-hover: rgba(255, 255, 255, 0.28);

  /* Selection */
  --selection-bg: rgba(122, 183, 255, 0.30);
}
```

### 3.2 Light theme (ChatGPT-style light)

```css
:root[data-theme="light"] {
  color-scheme: light;

  --bg-app:            #ffffff;
  --bg-sidebar:        #f9f9f9;
  --bg-surface:        #ffffff;
  --bg-surface-raised: #f4f4f4;
  --bg-surface-sunken: #f7f7f8;
  --bg-elevated:       #ffffff;
  --bg-modal:          #ffffff;
  --bg-overlay:        rgba(0, 0, 0, 0.35);

  --bg-hover:          rgba(0, 0, 0, 0.04);
  --bg-active:         rgba(0, 0, 0, 0.07);
  --bg-selected:       #ececec;
  --bg-input:          #ffffff;
  --bg-input-hover:    #fafafa;

  --text-primary:      #0d0d0d;
  --text-secondary:    #5d5d5d;
  --text-tertiary:     #8f8f8f;
  --text-disabled:     #b8b8b8;
  --text-inverse:      #ffffff;
  --text-link:         #0b6bcb;

  --border-subtle:     rgba(0, 0, 0, 0.06);
  --border-default:    rgba(0, 0, 0, 0.10);
  --border-strong:     rgba(0, 0, 0, 0.18);
  --border-focus:      rgba(0, 0, 0, 0.45);

  --btn-primary-bg:        #0d0d0d;
  --btn-primary-bg-hover:  #2b2b2b;
  --btn-primary-text:      #ffffff;
  --btn-secondary-bg:      transparent;
  --btn-secondary-bg-hover: rgba(0, 0, 0, 0.04);
  --btn-secondary-border:  rgba(0, 0, 0, 0.12);

  --accent:            #10a37f;
  --accent-hover:      #0e8f70;
  --accent-soft:       rgba(16, 163, 127, 0.10);
  --accent-text:       #0b7a5f;

  --success:           #1a9d5a;  --success-soft: rgba(26, 157, 90, 0.10);
  --warning:           #b7791f;  --warning-soft: rgba(183, 121, 31, 0.10);
  --danger:            #d92d20;  --danger-soft:  rgba(217, 45, 32, 0.08);
  --info:              #1570ef;  --info-soft:    rgba(21, 112, 239, 0.08);

  --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md:  0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg:  0 12px 40px rgba(0, 0, 0, 0.14);

  --scrollbar-thumb:       rgba(0, 0, 0, 0.18);
  --scrollbar-thumb-hover: rgba(0, 0, 0, 0.30);

  --selection-bg: rgba(11, 107, 203, 0.20);
}
```

### 3.3 Theme-independent tokens

```css
:root {
  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --text-xs:   12px;  --lh-xs:   16px;
  --text-sm:   13px;  --lh-sm:   20px;
  --text-base: 14px;  --lh-base: 22px;   /* default CRM UI text */
  --text-md:   16px;  --lh-md:   26px;   /* chat message text */
  --text-lg:   18px;  --lh-lg:   28px;
  --text-xl:   22px;  --lh-xl:   30px;
  --text-2xl:  28px;  --lh-2xl:  36px;

  --weight-regular: 400;
  --weight-medium:  500;
  --weight-semibold: 600;

  /* Spacing (4px base) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px;

  /* Radius */
  --radius-xs: 4px;   /* tiny tags */
  --radius-sm: 8px;   /* buttons, small inputs, menu items */
  --radius-md: 12px;  /* inputs, cards */
  --radius-lg: 16px;  /* modals, large cards */
  --radius-xl: 24px;  /* chat composer */
  --radius-full: 999px; /* pills, avatars */

  /* Layout */
  --sidebar-w: 260px;
  --sidebar-w-collapsed: 64px;
  --topbar-h: 56px;
  --content-max-w: 1280px;
  --chat-max-w: 768px;       /* AI Copilot message column */
  --right-panel-w: 360px;

  /* Motion */
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --dur-slow: 260ms;

  /* Z-index */
  --z-sticky: 10; --z-dropdown: 50; --z-overlay: 90; --z-modal: 100; --z-toast: 120;
}

::selection { background: var(--selection-bg); }
```

### 3.4 Global base styles

```css
html, body, #root { height: 100%; }
body {
  margin: 0;
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--lh-base);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Thin, unobtrusive scrollbars */
* { scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb) transparent; }
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
*::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); background-clip: content-box; }

/* Focus ring: visible for keyboard only */
:focus { outline: none; }
:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
```

### 3.5 Optional Tailwind mapping (only if the project uses Tailwind)

```js
// tailwind.config.js
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)', sidebar: 'var(--bg-sidebar)',
        surface: 'var(--bg-surface)', raised: 'var(--bg-surface-raised)',
        elevated: 'var(--bg-elevated)',
        fg: { DEFAULT: 'var(--text-primary)', muted: 'var(--text-secondary)', subtle: 'var(--text-tertiary)' },
        line: { DEFAULT: 'var(--border-default)', subtle: 'var(--border-subtle)', strong: 'var(--border-strong)' },
        accent: { DEFAULT: 'var(--accent)', soft: 'var(--accent-soft)' },
        success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)', info: 'var(--info)',
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)' },
      fontFamily: { sans: 'var(--font-sans)', mono: 'var(--font-mono)' },
    },
  },
};
```

---

## 4. Typography Rules

| Use | Size / Weight | Color |
|---|---|---|
| Page title (H1) | 22–28px / 600 | `--text-primary` |
| Section title (H2) | 18px / 600 | `--text-primary` |
| Card title | 14–16px / 600 | `--text-primary` |
| Body (CRM UI) | 14px / 400 | `--text-primary` |
| Chat message body | 16px / 400, line-height 26px | `--text-primary` |
| Secondary text / descriptions | 13–14px / 400 | `--text-secondary` |
| Meta / timestamps / helper | 12px / 400 | `--text-tertiary` |
| Table header | 12px / 500, **no uppercase** | `--text-secondary` |
| Code / IDs / API keys | 13px mono | `--text-primary` on `--bg-surface-sunken` |

- Use **Inter** (fallback to system fonts). Load with `font-display: swap`.
- No letter-spacing tweaks except `-0.01em` on titles ≥ 22px.
- Numbers in tables/dashboards: `font-variant-numeric: tabular-nums`.
- Truncate long text with ellipsis and show full text in a tooltip.

---

## 5. App Shell Layout

```
┌───────────────┬──────────────────────────────────────────────┬──────────────┐
│               │  Topbar (56px): breadcrumb · search · actions │              │
│   Sidebar     ├──────────────────────────────────────────────┤  Right panel │
│   260px       │                                              │  (optional,  │
│   --bg-sidebar│   Main content (--bg-app), scrolls           │  360px:      │
│               │   independently                              │  AI Copilot, │
│               │                                              │  details)    │
└───────────────┴──────────────────────────────────────────────┴──────────────┘
```

### 5.1 Sidebar (ChatGPT-style)
- Width **260px**, collapsible to **64px** (icons only), with a toggle button at the top. Persist state.
- Background `--bg-sidebar` (darker than canvas in dark mode). **No right border in dark mode** (color contrast is enough); use `1px solid var(--border-subtle)` in light mode.
- **Top:** org/workspace switcher (avatar + name + chevron), then a prominent "**+ New**" button (secondary style, full width, radius `--radius-sm`).
- **Nav groups** (small `--text-tertiary` 12px group labels, 500 weight): *Sales* (Contacts, Companies, Deals, Leads), *Activity* (Tasks, Meetings, Inbox), *Data* (Custom Objects, Tables), *Insights* (Reports, Dashboards), *AI* (Copilot, Agents), *Support*, *Marketing*.
- **Nav item:** height 36px, padding `8px 12px`, radius `--radius-sm`, icon 18px + label 14px `--text-secondary`.
  - Hover: `--bg-hover`.
  - Active/selected: `--bg-selected` + label `--text-primary` (weight 500). **No colored left bar.**
- **Custom objects** appear as nav items with their user-chosen icon; allow drag-reorder.
- **Bottom:** user profile row (avatar 32px, name, plan badge) → opens menu (Settings, Theme, Help, Log out). Settings/Admin link above it.
- On mobile (<768px) the sidebar becomes an off-canvas drawer with overlay.

### 5.2 Topbar
- Height 56px, background `--bg-app`, bottom border `--border-subtle` (or none in dark when scrolled to top; add border on scroll).
- Left: breadcrumb / page title (16px, 600) + optional object switcher.
- Center/Right: **global search field** (opens command palette on click or ⌘K / Ctrl+K), notifications bell (badge dot), AI Copilot toggle button, theme toggle, avatar.
- Global search field: pill, `--bg-surface-raised`, no border, placeholder `--text-tertiary`, shows `⌘K` hint chip on the right.

### 5.3 Main content
- Padding 24px (16px on mobile). Max width `--content-max-w` for form/detail/settings pages; tables and kanban may go full width.
- Page header: title (H1), description (`--text-secondary`), right-aligned primary action + secondary actions.
- Sticky sub-header for filters/view tabs with `backdrop-filter: blur(8px)` and `--bg-app` at 85% opacity.

### 5.4 Right panel
- 360px, slides in (`--dur-base`), `--bg-sidebar` or `--bg-app` with left border `--border-subtle`.
- Used for: AI Copilot, record quick-preview, activity details, filters.

---

## 6. Core Components

### 6.1 Buttons
| Variant | Style |
|---|---|
| **Primary** | bg `--btn-primary-bg`, text `--btn-primary-text`, radius `--radius-full` for hero actions or `--radius-sm` in dense toolbars, weight 500. Hover `--btn-primary-bg-hover`. |
| **Secondary** | transparent bg, 1px `--btn-secondary-border`, text `--text-primary`. Hover `--btn-secondary-bg-hover`. |
| **Ghost** | no border, no bg; hover `--bg-hover`. Used for icon buttons and toolbar actions. |
| **Danger** | bg `--danger`, white text; ghost-danger variant for inline delete. |
| **Accent** | bg `--accent`, white text. Only for AI-specific CTAs (e.g. "Generate with AI"). |

- Sizes: `sm` 28px, `md` 36px (default), `lg` 44px. Padding-x 12/16/20px. Icon-only buttons are square.
- Disabled: `opacity: .45`, `cursor: not-allowed`, no hover effect.
- Loading: replace label with a 16px spinner, keep width stable.
- Pressed: `transform: scale(0.98)` (optional, `--dur-fast`).

### 6.2 Inputs, selects, textareas
- Height 36px (md) / 44px (lg), radius `--radius-md`, bg `--bg-input`, 1px `--border-default`, text `--text-primary`, placeholder `--text-tertiary`.
- Hover: bg `--bg-input-hover`. Focus: border `--border-focus` + 3px ring `--bg-active` (no colored glow).
- Error: border `--danger`, helper text `--danger` 12px. Success is not decorated by default.
- Labels above field, 13px/500 `--text-primary`; helper text below, 12px `--text-tertiary`.
- Search inputs: leading search icon, pill or `--radius-md`, clear button when non-empty.
- Custom-field renderers (used by the no-code data layer): text, number, currency, date, datetime, select, multi-select (chips), user picker, relation picker (search + avatar list), checkbox, toggle, rating, URL, email, phone, file, rich text, JSON. **Every renderer must share the same input chrome above.**

### 6.3 Cards & panels
- bg `--bg-surface-raised` (dark) / `--bg-surface` + border (light), radius `--radius-lg`, padding 16–20px.
- Dark mode: border `--border-subtle` or none; Light mode: border `--border-default`.
- No drop shadow at rest. Hover on clickable cards: bg `--bg-hover` overlay or border `--border-strong`.

### 6.4 Tables (Contacts, Companies, Deals, Custom Tables)
- Container: radius `--radius-lg`, border `--border-subtle`, overflow hidden, horizontal scroll inside container only.
- Header row: 40px, bg `--bg-app` (sticky), text 12px/500 `--text-secondary`, bottom border `--border-default`. Sort icon on hover.
- Body row: **40px** compact (toggle "comfortable" 52px), bottom border `--border-subtle`, hover `--bg-hover`, selected `--bg-selected`.
- First column: checkbox (visible on hover/selected) + primary name (medium weight, link on hover underline).
- Sticky first column and sticky header.
- Column resize handles, drag-reorder columns, column visibility menu, frozen columns.
- Inline cell editing: double-click → input chrome from §6.2; Esc cancels, Enter saves.
- Bulk-action bar: appears at the bottom center as floating pill (`--bg-elevated`, `--shadow-md`, radius full) showing "N selected · Assign · Tag · Delete".
- Pagination or infinite scroll; footer shows "1–50 of 2,431" (`--text-tertiary`).
- Empty state: centered icon, title, description, primary CTA (see §8).
- Loading: skeleton rows (see §8).

### 6.5 Badges, chips, tags
- Height 22px, padding `0 8px`, radius `--radius-full`, 12px/500.
- Neutral: bg `--bg-active`, text `--text-secondary`.
- Semantic (status, lifecycle stage, priority): bg `*-soft`, text = the semantic color. Always include text (not color alone).
- AI-generated marker: small ✦ sparkle icon chip in `--accent-soft` / `--accent-text`, tooltip "AI-generated · confidence 87%".

### 6.6 Tabs
- Underline style for record pages: 40px height, active text `--text-primary` with 2px bottom border `--text-primary`; inactive `--text-secondary`.
- Segmented (view switcher Grid/Kanban/Calendar/Gallery/Timeline): container `--bg-surface-raised`, radius `--radius-sm`, active pill `--bg-active`.

### 6.7 Dropdowns, popovers, context menus
- bg `--bg-elevated`, 1px `--border-default`, radius `--radius-md`, `--shadow-md`, padding 4px, min-width 200px.
- Item: 32–36px height, radius `--radius-sm`, hover `--bg-hover`, destructive items in `--danger`.
- Dividers `--border-subtle`. Keyboard navigation (arrows, Enter, Esc, type-ahead). Use Radix primitives.
- Animate: fade + 4px translate, `--dur-fast`.

### 6.8 Modals & drawers
- Backdrop `--bg-overlay` (+ optional 2px blur). Modal bg `--bg-modal`, radius `--radius-lg`, `--shadow-lg`, max-width 480 (confirm) / 640 (form) / 900 (large).
- Header 18px/600 + close (ghost icon button). Footer right-aligned: Secondary (Cancel) + Primary.
- Side drawers (record edit, filters): 480px, slide from right, same styling.
- Trap focus, close on Esc, restore focus on close.

### 6.9 Toasts
- Bottom-center (like ChatGPT) or bottom-right; `--bg-elevated`, border `--border-default`, radius `--radius-md`, `--shadow-md`, 14px text, icon by type, optional action link. Auto-dismiss 4s; errors persist until dismissed.

### 6.10 Tooltips
- bg `#0d0d0d` in light / `#ececec` text-on-dark inverted in dark? → **Use inverted style:** light mode = dark tooltip (`#0d0d0d`, white text); dark mode = `#ffffff`-ish (`#ececec`, text `#0d0d0d`). 12px, radius `--radius-sm`, padding `4px 8px`, delay 400ms.

### 6.11 Avatars
- Sizes 20/24/32/40px, `--radius-full`. Fallback initials on a deterministic muted color (hash user id into 8 muted neutral-tinted hues at ~30% saturation so it doesn't fight the neutral UI). Presence dot (8px) optional.

### 6.12 Command palette (⌘K)
- Centered modal 640px wide, radius `--radius-lg`, `--bg-elevated`, input on top (no border, 16px), grouped results (Recent, Records, Actions, Navigate, Ask AI), keyboard-first. Highlighted row `--bg-hover` with `--radius-sm`. Footer hint row with key legends in `--text-tertiary`.
- Last row/section: "✦ Ask AI: <query>" hands the query to the Copilot.

### 6.13 Icons
- **lucide-react**, 18px default (16px in dense tables, 20px in sidebar collapsed), stroke width 1.75, `currentColor`. Never mix icon sets.

---

## 7. CRM-Specific Screens

### 7.1 List / Object view (Contacts, Companies, Deals, Custom Objects)
1. Page header: title + record count + `+ New <Object>` (primary).
2. **View bar:** saved views as tabs/chips (All, My records, Recently created, + custom), view-type segmented control (Grid · Kanban · Calendar · Gallery · Timeline).
3. **Toolbar:** search-in-list, Filter (opens popover with AND/OR builder), Sort, Group by, Columns, Import/Export, "Save view".
4. Filter chips appear under the toolbar: `Field · operator · value ✕`, radius full, `--bg-surface-raised`.
5. Table or alternate view below.

### 7.2 Record page (consistent for every object)
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back   Contact › Jane Cooper                 [Actions ▾]  │
├──────────────┬───────────────────────────────┬──────────────┤
│ Left (300px) │ Center (flex)                 │ Right(320px) │
│ Avatar+name  │ Tabs: Overview·Activity·Notes │ Associations │
│ Key props    │ Unified timeline (chronolog.) │ (Company,    │
│ (editable    │ Composer: Note/Email/Call/Task│  Deals,      │
│  inline)     │                               │  Tickets)    │
│ Owner, stage │                               │ AI summary ✦ │
└──────────────┴───────────────────────────────┴──────────────┘
```
- Left column property rows: label `--text-tertiary` 12px above value 14px; click value to edit inline.
- **Unified timeline:** vertical list, each item = small icon in a 28px circle (`--bg-surface-raised`), title, timestamp `--text-tertiary`, expandable body. Group by day with sticky day labels. Filter chips: All · Emails · Calls · Meetings · Notes · Tasks · Automation · AI.
- Activity composer: rounded `--radius-lg` box with tabs (Note / Email / Call / Task), toolbar, primary "Save" button.
- **AI Summary card** at the top of the right column: accent-soft sparkle header, 3–5 bullets, "Regenerate" ghost button, last-updated meta.

### 7.3 Deals Kanban
- Columns: width 300px, bg transparent, header = stage name + count + total value (`--text-tertiary`), `+` add.
- Cards: bg `--bg-surface-raised`, radius `--radius-md`, padding 12px, border `--border-subtle`; show deal name (500), company, value (tabular-nums), close date, owner avatar, probability chip.
- Drag: card lifts with `--shadow-md`, slight rotate(1deg), drop placeholder = dashed `--border-strong` outline, radius `--radius-md`.
- Column scroll independent; board scrolls horizontally. Won = `--success-soft` header tint, Lost = `--danger-soft`.

### 7.4 Dashboard & reports
- Grid of cards (12-col, gap 16px). Each widget: title (14px/600), optional filter/date chip, chart/number area, "⋯" menu.
- KPI card: big number 28px/600 tabular-nums, delta chip (▲ green / ▼ red), sparkline.
- Chart palette (works on both themes, colorblind-safe, muted): `#10a37f`, `#5aa9ff`, `#f5a524`, `#b48cf2`, `#f0524d`, `#8e8e8e`. Gridlines `--border-subtle`, axis text `--text-tertiary` 12px, tooltip = elevated menu style. No gradients fills heavier than 12% opacity.
- Edit mode: dashed outline on widgets, drag handles, resize corners.

### 7.5 Custom Object / Custom Table builder
- Two-pane: left = field list (drag to reorder, each row: drag handle, icon by type, name, type badge, required marker, ⋯), right = field settings form.
- "+ Add field" opens a type picker grid (icon + name + one-line description) in a popover.
- Relationship editor: visual pills `Object A ──(one-to-many)── Object B`.
- Preview toggle showing how the record form will look.

### 7.6 Workflow / Automation builder
- Canvas background `--bg-surface-sunken` with subtle dot grid (`--border-subtle`).
- Nodes: cards `--bg-surface-raised`, radius `--radius-md`, header with icon + type label (Trigger / Condition / Action) in the semantic chip style; connectors 1.5px `--border-strong` with small arrowheads; "+" add-node buttons appear on connector hover.
- Right settings drawer for the selected node.
- **Execution history tab** (table): status badge, trigger record, duration, error; row click opens step-by-step log with per-step input/output JSON in a mono code block (`--bg-surface-sunken`). This is the "why didn't my automation run?" screen — make status and error reasons very legible.

### 7.7 Admin Center & Settings
- Left sub-nav (240px) with groups: Organization, Users & Teams, Roles & Permissions, Objects & Fields, Pipelines, Automations, Integrations, API & Webhooks, Billing, Security, Audit Logs, System/Automation/API Logs.
- Content: max-width 880px, sections as cards with title/description on the left (280px) and controls on the right (like ChatGPT settings), separated by `--border-subtle`.
- Permission matrix: table with sticky first column; cells are 3-state segmented controls (None / Own / Team / All) or (Hidden / View / Edit); highlight changed cells with `--warning-soft` until saved; sticky "Save changes" bar at bottom.
- Danger zone card: border `--danger` at 40% opacity, danger button.

### 7.8 Login / Onboarding
- Centered card 400px on `--bg-app`, logo top, heading 24px/600, stacked inputs `lg` size, primary pill button full-width, "Continue with Google/Microsoft" as secondary full-width buttons, divider "OR" in `--text-tertiary`. Nothing else on screen — keep it as minimal as ChatGPT's login.

---

## 8. AI Copilot — ChatGPT-Style Chat UI (key differentiator)

This is where the ChatGPT look matters most. Implement as (a) a full page at `/copilot` and (b) the right-panel version (360px) on any record page.

### 8.1 Layout (full page)
- Conversation history list lives in the **main sidebar** section "AI" (like ChatGPT's chat list): grouped Today / Yesterday / Previous 7 days; item 36px, truncated title, ⋯ menu on hover (Rename, Share, Delete).
- Message column: centered, `max-width: var(--chat-max-w)` (768px), padding-x 16px, vertical gap 24px.
- Composer is **pinned at the bottom**, centered in the same column, with a small disclaimer line under it (12px `--text-tertiary`): "AI can make mistakes. Verify important CRM data."

### 8.2 Messages
- **User message:** right-aligned bubble, bg `--bg-surface-raised`, radius `18px`, padding `10px 16px`, max-width 70%, text 16px.
- **Assistant message:** **no bubble, no background**, full column width, small ✦ avatar (28px circle, 1px `--border-default`) on the left or omitted; text 16px/26px `--text-primary`; paragraphs gap 12px; lists with 24px indent.
- Markdown: headings 18/16px 600; inline code = `--bg-surface-raised` radius 4px mono 13px; code blocks = `--bg-surface-sunken`, radius `--radius-md`, header bar with language + Copy button, horizontal scroll.
- Action row under each assistant message (ghost icon buttons, `--text-tertiary`, appear on hover): Copy, Thumbs up/down, Regenerate.
- **Streaming:** append tokens smoothly; show a pulsing 8px dot at the end of the text while generating.
- **Tool/CRM action steps** (agent transparency): collapsed inline row `⚙ Searched deals · 12 results ▸` (13px `--text-secondary`, radius `--radius-sm`, hover `--bg-hover`); expanding shows the query and result summary. Any write action (create task, update record) renders as an **action card** with Approve / Reject buttons before execution when the org requires confirmation.
- **Rich results:** when the AI returns records, render a compact table/cards (same table styling as §6.4) inside the message, with "Open in Deals" link.
- Citations/sources: small numbered chips `[1]` linking to records/KB articles.

### 8.3 Composer (signature ChatGPT element)
- Container: bg `--bg-surface-raised`, radius `--radius-xl` (24px), padding `10px 12px`, **no visible border in dark** (1px `--border-default` in light), min-height 52px, max-height 200px auto-grow textarea.
- Layout: `[+ attach]  [ textarea "Ask anything about your CRM…" ]  [🎤] [➤ send]`.
- **Send button:** 32px circle, bg `--btn-primary-bg` (white in dark / black in light), arrow-up icon in `--btn-primary-text`; disabled state bg `--bg-active`, icon `--text-disabled`. While generating it becomes a **stop** button (filled square icon).
- `+` menu: attach file, mention record (`@`), choose agent, use template. Support `@` mentions of records and `/` commands with a popover list.
- Enter = send, Shift+Enter = newline.

### 8.4 Empty state (new chat)
- Vertically centered greeting (28px/600): "What can I help you with?"
- Composer beneath it, then 4 suggestion chips (radius full, `--bg-surface-raised`, 14px): e.g. "Deals over $50K with no activity in 14 days", "Summarize my pipeline", "Draft a follow-up email", "Which accounts are at churn risk?".

---

## 9. States & Feedback

### 9.1 Skeleton loading
- Blocks in `--bg-surface-raised` with a shimmer (`linear-gradient` sweep with `--bg-hover`), radius matches the real element, 1.4s loop. Table = 8 skeleton rows; record page = skeleton for header, properties, timeline.
- Respect `prefers-reduced-motion`: disable shimmer, use static blocks.

### 9.2 Empty states
- Centered, max-width 360px: 40px icon in `--text-tertiary`, title 16px/600, description 14px `--text-secondary`, primary CTA. Never leave a blank area.

### 9.3 Error states
- Inline field errors (see inputs). Page-level: card with danger-soft background, icon, message, "Retry" and "Copy error ID" buttons (for support). Never show raw stack traces.

### 9.4 Optimistic UI
- Inline edits and kanban drags update instantly; roll back with an error toast on failure.

### 9.5 Permission-aware UI
- Hidden fields (field-level permission) are **not rendered at all**. View-only fields render as plain text without edit affordance. Disabled actions show a tooltip explaining why ("Ask an admin for delete access"). Never rely on the UI as the security boundary — the backend enforces it.

---

## 10. Motion

- Keep it subtle. Durations 120–260ms, easing `--ease`.
- Animate: dropdown/popover (fade + 4px slide), modal (fade + scale .98→1), drawer (slide), sidebar collapse (width), toast (slide up + fade), hover backgrounds.
- Do **not** animate table rows on load, page transitions, or large layout shifts.
- `@media (prefers-reduced-motion: reduce)` → disable non-essential animation.

---

## 11. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| ≥ 1280px | Full layout: sidebar + content + optional right panel |
| 1024–1279px | Right panel becomes overlay drawer; record page → 2 columns |
| 768–1023px | Sidebar collapsed to icons by default; tables scroll horizontally |
| < 768px | Sidebar = off-canvas drawer; topbar simplified; tables become **card lists**; kanban = horizontal scroll with snap; modals become bottom sheets; composer stays pinned above the safe area |

- Minimum tap target 40px on touch devices.
- Use `env(safe-area-inset-*)` for fixed bars on mobile.

---

## 12. Accessibility (required)

- Contrast: text on backgrounds must meet WCAG AA (4.5:1 body, 3:1 large/UI). `--text-tertiary` is for non-essential metadata only.
- Every interactive element reachable by keyboard with a visible `:focus-visible` ring.
- Semantic HTML + ARIA via Radix; labels on all inputs; `aria-live="polite"` for toasts and streaming AI responses (throttled).
- Never convey status by color alone (add text/icon).
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Tables: proper `<th scope>`, sortable columns announce sort state.

---

## 13. Suggested File Structure

```
src/
  styles/
    tokens.css          # §3 variables (light + dark)
    base.css            # §3.4 global styles
  theme/
    ThemeProvider.jsx   # light | dark | system, persists, sets data-theme
    useTheme.js
  components/ui/        # primitives
    Button.jsx  Input.jsx  Select.jsx  Textarea.jsx  Checkbox.jsx  Switch.jsx
    Card.jsx  Badge.jsx  Avatar.jsx  Tabs.jsx  Tooltip.jsx  Toast.jsx
    Dropdown.jsx  Modal.jsx  Drawer.jsx  Table.jsx  Skeleton.jsx  EmptyState.jsx
    CommandPalette.jsx
  components/layout/
    AppShell.jsx  Sidebar.jsx  Topbar.jsx  RightPanel.jsx  PageHeader.jsx
  components/crm/
    RecordPage.jsx  Timeline.jsx  PropertyList.jsx  KanbanBoard.jsx
    FieldRenderer.jsx  ViewBar.jsx  FilterBuilder.jsx  PermissionMatrix.jsx
    WorkflowCanvas.jsx  ExecutionLog.jsx
  components/ai/
    CopilotChat.jsx  Message.jsx  Composer.jsx  ToolStep.jsx  ActionCard.jsx  SuggestionChips.jsx
```

---

## 14. Migration Checklist for the Existing App

- [ ] Find current theme implementation and list all files with hardcoded colors (`grep -rE "#[0-9a-fA-F]{3,8}|rgb\(" src`).
- [ ] Add `tokens.css` and `base.css`; import at root.
- [ ] Update ThemeProvider to set `data-theme` and support `system`; add the anti-flash inline script.
- [ ] Restyle AppShell: sidebar `--bg-sidebar`, canvas `--bg-app`, topbar, collapse behavior.
- [ ] Replace hardcoded colors in existing components with tokens.
- [ ] Rebuild/restyle primitives (§6) and use them everywhere.
- [ ] Restyle tables, filters, saved views (§7.1).
- [ ] Restyle record page + unified timeline (§7.2).
- [ ] Restyle Kanban (§7.3), dashboards (§7.4).
- [ ] Build/restyle AI Copilot chat (§8).
- [ ] Restyle admin/settings and login (§7.7, §7.8).
- [ ] Add skeletons, empty states, error states (§9).
- [ ] Responsive pass (§11) and accessibility pass (§12).
- [ ] Visual QA every screen in **both** themes; screenshot comparison.

---

## 15. Definition of Done

1. Dark mode uses neutral grays (`#171717` sidebar, `#212121` canvas, `#2f2f2f` raised surfaces, `#ececec` text) — **no blue-tinted blacks anywhere**.
2. Primary buttons are white-on-dark / black-on-light; green accent appears only for AI/success.
3. Zero hardcoded colors remain outside `tokens.css`.
4. Light/dark/system switching works, persists, and has no flash on load.
5. Every object (standard or custom) shares the same list view and record page layout.
6. The AI Copilot looks and behaves like a modern chat: bubble-less assistant text, pill composer, round send button, streaming, tool steps, suggestion chips.
7. All screens pass keyboard navigation and AA contrast checks, and work at 375px, 768px, and 1440px widths.

---

## 16. Quick Prompt to Give the CLI

> Read `UI.md` fully. Inspect the existing frontend and theme system first. Then implement the design system in the order listed in §0 item 6 — starting with `tokens.css` (§3), the ThemeProvider (§2), and the AppShell (§5). Do not hardcode colors; use the CSS variables only. Reuse existing components where possible and restyle them. After each step, run the app, verify light and dark modes, and summarize what changed before moving on.
