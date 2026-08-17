<!-- BEGIN:nextjs-agent-rules -->

# MediVault Project Instructions

## 1. Design System & Anti-AI UI Directives

**MANDATORY FIRST STEP:** Read `design-system/medivault/MASTER.md` before writing any UI code. It is the single source of truth. Never regenerate or contradict it.

Every interface generated must pass the **Real Product Benchmark** (Linear / Stripe / Epic quality standard):

- **60-30-10 Rule:** 60% neutral canvas (`#FFFFFF` / `#F8FAFC`), 30% structural contrast/dividers (`#0F172A` / `#E2E8F0`), 10% accent teal (`#0891B2`). Never fill the canvas with saturated brand color.
- **Color Quarantine:** Zero "rainbow badge soup". State colors (Red/Amber/Green) reserved strictly for true clinical status. No decorative purple/pink gradients.
- **Card-itis Elimination:** Use 1px border dividers (`divide-y divide-slate-100`) and data tables rather than nested floating boxes.
- **Tabular Numerals:** All timestamps, metrics, dosages, and hashes must use `font-mono tabular-nums` (the CSS class `tabular`).
- **Restrained Radii:** `rounded-lg` (8px) for buttons/inputs, `rounded-xl`/`rounded-2xl` (12–16px) for cards. Zero emojis (use `lucide-react` SVG vector icons only).

---

## 2. BANNED CSS Classes & Patterns — Never Use These

The following are **automatically rejected** — do not use in any generated component:

```
❌ rounded-3xl           — on anything except a top-level hero shell
❌ bg-purple-*           — not in design system palette
❌ bg-indigo-*           — not in design system palette  
❌ bg-orange-*           — not in design system palette
❌ from-[#0891B2] ... to-[#22D3EE] — gradient on dashboard/portal headers (landing hero only)
❌ blur-3xl (orb decorations inside portal layouts)
❌ transform: translateY(-Xpx) on hover — use shadow escalation only
❌ border-radius: 9999px on buttons — use rounded-lg or rounded-xl
❌ font-heading on numeric stat values — use font-mono tabular-nums
```

---

## 3. Standardized Component Stack

**Import order priority — always check before writing new Tailwind patterns:**

1. `src/app/components/ui/` — shadcn/ui components (Table, Badge, Card, Skeleton, Avatar, Alert, etc.)
2. **Radix UI Primitives** (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`, `@radix-ui/react-select`)
3. **`cmdk`** — Spotlight / Command Palettes (`Ctrl+K`)
4. **`sonner`** — toast notifications (never build custom toasts)
5. **`lucide-react`** — all SVG icons (24x24 viewBox, w-4/w-5 sizing)
6. **`motion`** (from `motion/react`) — page transitions, AnimatePresence, layout animations
7. **`recharts`** — all clinical data charts (AreaChart, BarChart, LineChart)
8. **`react-hook-form` + `zod`** — all forms with clinical data validation

Never duplicate reusable components. Never invent inline Tailwind one-offs when a shadcn component exists.

---

## 4. Required Feature Icon Pattern

All feature grid icon containers must use a **single standard style** (not per-feature custom colors):

```tsx
// CORRECT — neutral brand icon container
<div className="w-11 h-11 rounded-xl bg-slate-50 text-[#0891B2] flex items-center justify-center border border-slate-200">
  <IconName className="w-5 h-5" />
</div>

// EXCEPTION — Rose/red ONLY for genuine emergency/critical content
<div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
```

---

## 5. Dashboard / Portal Header Rule

Dashboards and portal pages must use a **white card with left-border accent**, NOT a full-width saturated gradient:

```tsx
// CORRECT
<div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#0891B2] p-6 shadow-xs">

// BANNED — full-width saturated brand gradient
<div className="bg-gradient-to-r from-[#0891B2] ... rounded-3xl">
```

---

## 6. Chart Usage — recharts

Use recharts for all clinical data visualization. Configure with:
- `CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false}` — horizontal grid lines only
- `tick={{ fontSize: 11, fill: "#64748B" }}` on axes
- Gradient fills using `linearGradient` defs for area charts
- Tooltip `contentStyle={{ borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "12px" }}`

---

## 7. Form Validation — react-hook-form + zod

All forms with clinical data (patient profile, vitals, allergies) must use react-hook-form + zod schema:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
```

---

## 8. Framework & Technical Standards

- **Framework:** Next.js App Router (Next.js 16+ Turbopack)
- **Language:** TypeScript (strict typing — no `any` without comment)
- **Styling:** Tailwind CSS v4
- **Accessibility:** WCAG 2.1 AAA minimum (4.5:1 contrast, 44×44px touch targets, visible focus rings, `prefers-reduced-motion` respected via `MotionConfig reducedMotion="user"`)

---

## 9. Development & Code Safety Rules

Never break:
- Authentication & Supabase session JWTs
- API integration & PostgreSQL data flows
- Business logic & role-based routing
- State management

---

## 10. Pre-Delivery Quality Gate (9-Point Checklist)

Before finalizing any component or page:

- [ ] No rainbow badge soup (max 3 distinct bg colors on screen)
- [ ] 60-30-10 color balance — no saturated canvas
- [ ] No nested card-itis (use divider-first lists)
- [ ] Tabular data uses `font-mono tabular-nums` / `.tabular` class
- [ ] Interactive elements have `cursor-pointer` and 150ms transitions
- [ ] All icons from `lucide-react` (zero emojis)
- [ ] WCAG 2.1 AAA contrast verified (4.5:1 minimum)
- [ ] No banned CSS patterns from Section 2
- [ ] Full TypeScript build passes with 0 errors (`npm run build`)

---

For every response, begin by writing:

"Loaded MediVault project instructions."

<!-- END:nextjs-agent-rules -->