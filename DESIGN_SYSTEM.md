# Sprout Design System

## 1. Type Scale

No two unrelated pieces of text share the same `{size, weight, color}` combination unless they occupy the same semantic level.

| Token | Size | Line‑height | Weight | Color | Usage |
|---|---|---|---|---|---|
| `--fs-hero` | 30px / 36px sm | 1.15 | 800 | text-primary | Landing hero headline |
| `--fs-heading` | 24px | 1.3 | 700 | text-primary | Page titles (h1) |
| `--fs-subheading` | 20px | 1.4 | 600 | text-primary | Section headings (h2) |
| `--fs-section` | 18px | 1.4 | 600 | text-primary | Card‑group titles (h3) |
| `--fs-card-title` | 16px | 1.5 | 600 | text-primary | Individual card/component titles |
| `--fs-body` | 14px | 1.5 | 400 | text-primary | Body copy, descriptions, input text |
| `--fs-body-strong` | 14px | 1.5 | 600 | text-primary | Emphasised body, button labels |
| `--fs-secondary` | 14px | 1.5 | 400 | text-secondary | Secondary body text |
| `--fs-label` | 12px | 1.3 | 600 | text-secondary | Form labels, section meta |
| `--fs-caption` | 12px | 1.3 | 400 | text-secondary | Timestamps, helper text |

**Implementation:** Use utility classes that map to these tokens:

```css
.text-hero { font-size: var(--fs-hero); font-weight: 800; }
.text-heading { font-size: var(--fs-heading); font-weight: 700; }
/* etc. — see globals.css */
```

---

## 2. Spacing Scale

Use **only** the following values. Any class outside this set is a design debt.

| Class | Rem | Pixels | Typical use |
|---|---|---|---|
| `p-1` / `gap-1` | 0.25 | 4px | Tight icon gaps, inner padding |
| `p-2` / `gap-2` | 0.5 | 8px | Input padding, button horizontal |
| `p-3` / `gap-3` | 0.75 | 12px | Standard gap between elements |
| `p-4` / `gap-4` | 1 | 16px | Card padding, section spacing |
| `p-6` / `gap-6` | 1.5 | 24px | Large card padding, modal padding |
| `p-8` / `gap-8` | 2 | 32px | Section vertical padding |
| `p-12` / `gap-12` | 3 | 48px | Page section padding |
| `p-16` / `gap-16` | 4 | 64px | Hero/landing section padding |
| `p-24` / `gap-24` | 6 | 96px | Full‑page empty states, hero |

**Forbidden values** (most common offenders from audit):
`p-5` (20px), `py-2.5` (10px), `mb-1.5` (6px), `gap-1.5` (6px), `px-5` (20px), `py-10` (40px), `py-20` (80px), `ml-11` (44px), `w-4.5 h-4.5` (18px), `space-y-5` (20px), `h-0.5` (2px).

---

## 3. Elevation

Three levels only. Most containers get **no** shadow.

| Level | Token | Usage |
|---|---|---|
| Flat | `none` | Default — cards, inputs, panels |
| Raised | `--shadow-card` | Cards on hover, modals, dropdowns |
| High | `--shadow-modal` | Full‑screen modals, toast notifications |

```css
--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
--shadow-modal: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```

---

## 4. Border Radius

Two values max.

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 8px | Inputs, buttons, small containers, avatars |
| `--radius-lg` | 16px | Cards, modals, large containers |

`rounded-full` is reserved exclusively for **avatars** and **status pills**.

---

## 5. Motion

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 250ms cubic-bezier(0.4, 0, 0.2, 1);
```

Every interactive element **must** define:
- `transition: background var(--transition-fast)` for colour changes
- `transition: transform var(--transition-fast)` for scale/translate
- `transition: box-shadow var(--transition-fast)` for elevation changes

**Hover/active/focus baseline:**
- Buttons: `hover:bg-accent-hover`, `hover:shadow-sm`, `active:scale-[0.97]`, `focus-visible:ring-2 focus-visible:ring-accent/40`
- Cards: `card-hover` (translateY(-2px) + shadow-card)
- Links: `hover:text-accent` (or underline, depending on context)
- Inputs: `focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent`

---

## 6. Component States

Every data‑driven component must define three states:

| State | Behaviour |
|---|---|
| **Loading** | Skeleton matching content shape (not generic spinner). Show skeleton immediately, replace with content once loaded. |
| **Empty** | Illustration/icon + clear message + single CTA. No blank spaces. |
| **Error** | Inline error banner with message + retry action. Not a toast (unless global). |

---

## 7. Colour Tokens (existing — documented for reference)

The existing palette in `globals.css` is correct. Use **semantic classes** everywhere:

| Class | Maps to | Use |
|---|---|---|
| `bg-page` | `var(--bg-page)` | Page backgrounds |
| `bg-surface` | `var(--bg-surface)` | Card, input, modal backgrounds |
| `bg-surface-alt` | `var(--bg-surface-alt)` | Secondary surfaces, hover states |
| `text-primary` | `var(--text-primary)` | Primary content |
| `text-secondary` | `var(--text-secondary)` | Supporting content |
| `border-border` | `var(--border)` | Default borders |
| `bg-accent` | `var(--accent)` | Primary CTA backgrounds |
| `text-accent-on` | `var(--accent-text-on)` | Text on accent backgrounds |
| `bg-structure` | `var(--structure)` | Brand/nav backgrounds |

**Avoid** direct earth‑/sprout‑/accent- numeric classes in new code. The semantic classes handle dark mode automatically.

---

## 8. Icon Sizing

Only three sizes across the entire app:

| Size | Usage |
|---|---|
| `w-4 h-4` (16px) | Inline icons, button icons, small meta |
| `w-5 h-5` (20px) | Section headers, list item icons |
| `w-6 h-6` (24px) | Empty states, primary actions, large avatars |

**Forbidden:** `w-3`, `w-3.5`, `w-4.5`, `w-7`, `w-8`, `w-10`, `w-11`, `w-14`, `w-16`, `w-20`. (These are fine for avatars/illustrations, but never for icon sizing.)

---

## 9. Button Taxonomy

Three button styles only:

| Type | Classes | Use |
|---|---|---|
| Primary | `bg-accent text-accent-on rounded-[--radius-sm] px-4 py-2 text-sm font-semibold hover:bg-accent-hover active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-[--transition-fast]` | Main action per page |
| Secondary | `border border-border text-primary rounded-[--radius-sm] px-4 py-2 text-sm font-semibold hover:bg-surface-alt active:scale-[0.97] transition-all duration-[--transition-fast]` | Alternative actions |
| Ghost | `text-secondary rounded-[--radius-sm] px-3 py-1.5 text-sm font-medium hover:text-primary hover:bg-surface-alt transition-all duration-[--transition-fast]` | Subtle/dismiss actions |

No gradient buttons. No coloured shadows. No `px-5`. No `py-2.5`.

---

## 10. Avatar Sizing

| Size | Class | Usage |
|---|---|---|
| Small | `w-8 h-8 text-xs` | Comment authors, message list |
| Medium | `w-10 h-10 text-sm` | Conversation header, project card |
| Large | `w-16 h-16 text-xl` | Profile page hero |

All avatars: `rounded-full bg-gradient-to-br from-sprout-500 to-sprout-600 flex items-center justify-center text-white font-bold shrink-0`.
