---
name: apple-hig
description: >
  Apply Apple Human Interface Guidelines (HIG) to UI/UX design and component code.
  Use this skill when the user asks about: iOS/macOS border radius standards, Apple spacing,
  SF Pro typography, Apple system colors, shadow/depth, HIG-compliant components, or wants
  their UI to "look like Apple". Trigger on: "Apple design", "iOS style", "HIG",
  "Human Interface Guidelines", "border radius iOS", "Apple spacing", "SF Pro",
  "review UI like Apple", "Apple-style component", "React Native HIG component",
  "SwiftUI style", "iOS color system", "dynamic type iOS", "make it look like Apple",
  "Apple design system", "looks like settings app".
---

# Apple Human Interface Guidelines (HIG) Skill

## What this skill does

1. **Review UI** — Analyze existing design and flag deviations from HIG
2. **Suggest** — Provide specific values (radius, spacing, color, shadow...)
3. **Code** — Generate React / React Native components following HIG standards

When the user asks about reviewing → also read `references/review.md`
When the user asks about coding → also read `references/code.md`
When asking about specific tokens (spacing, color, type...) → read `references/tokens.md`

---

## 3 Core Principles

| Principle | Meaning | In practice |
|---|---|---|
| **Clarity** | Everything must be immediately legible and understandable | Adequate font sizes, high contrast, unambiguous icons |
| **Deference** | UI steps back for content, never competes with it | Blur/translucency over solid fills, secondary elements recede |
| **Depth** | Layering and motion create a sense of space | Blur layers, subtle shadows, meaningful transitions |

---

## Quick Reference — Most-used tokens

### Border Radius
```
4px   — Small elements: tags, badges
8px   — Input fields, small cards
12px  — Buttons, menu items
16px  — Cards, small modals
20px  — Bottom sheets, large cards
28px  — Large modals, full sheets
continuous (squircle) — App icons (use clip-path or library)
```

> Apple uses **continuous corners** (squircle) for app icons — not standard border-radius. On the web, `border-radius: 22.5%` is a close approximation.

### Spacing (4px base grid)
```
4px   — Gap between inline elements
8px   — Small padding, icon-to-text gap
12px  — Button padding
16px  — Card padding, list item padding
20px  — Small section gap
24px  — Section gap
32px  — Large section gap
44px  — Minimum touch target (CRITICAL)
```

### Typography — SF Pro / Dynamic Type scale
```
Caption 2   — 11px / regular
Caption 1   — 12px / regular
Footnote    — 13px / regular
Subheadline — 15px / regular
Callout     — 16px / regular
Body        — 17px / regular  ← default body text
Headline    — 17px / semibold
Title 3     — 20px / regular
Title 2     — 22px / regular
Title 1     — 28px / regular
Large Title — 34px / regular
```

Web font stack: `SF Pro` (if licensed), `-apple-system`, `BlinkMacSystemFont`, `Inter` (closest alternative)

### iOS System Colors (Light mode)
```
systemBlue    — #007AFF  (primary action, links)
systemGreen   — #34C759
systemRed     — #FF3B30
systemOrange  — #FF9500
systemYellow  — #FFCC00
systemPink    — #FF2D55
systemPurple  — #AF52DE
systemTeal    — #5AC8FA
systemIndigo  — #5856D0
systemGray    — #8E8E93
systemGray2   — #AEAEB2
systemGray3   — #C7C7CC
systemGray4   — #D1D1D6
systemGray5   — #E5E5EA
systemGray6   — #F2F2F7  (grouped background)
```

Label colors:
```
label (primary)    — #000000
secondaryLabel     — rgba(60,60,67,0.6)
tertiaryLabel      — rgba(60,60,67,0.3)
quaternaryLabel    — rgba(60,60,67,0.18)
separator          — rgba(60,60,67,0.29)
```

### Shadow
Apple shadows are always subtle — never harsh:
```css
/* Small card */
box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);

/* Modal / Sheet */
box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08);

/* Elevated card */
box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
```

---

## UI Review Checklist

### 1. Touch targets
- [ ] Every tappable element ≥ 44×44px
- [ ] Adequate spacing between targets to prevent mis-taps

### 2. Typography
- [ ] Body text ≥ 17px (or ≥ 15px with good line-height)
- [ ] Contrast ratio ≥ 4.5:1 (WCAG AA — Apple enforces this)
- [ ] No more than 2–3 font weights per screen

### 3. Spacing & Layout
- [ ] Padding follows 4px grid
- [ ] Content side margins ≥ 16px (mobile) / 20px (tablet)
- [ ] List item vertical padding ≥ 16px

### 4. Color
- [ ] Primary action uses systemBlue (#007AFF) or a consistent brand color
- [ ] Destructive actions use systemRed (#FF3B30)
- [ ] Background hierarchy is clear: grouped bg (#F2F2F7) vs card bg (#FFFFFF)

### 5. Border Radius
- [ ] Radius is consistent within the same component family
- [ ] Button radius: 12px or pill (border-radius: 9999px)
- [ ] Card radius ≥ 12px

### 6. Depth & Layering
- [ ] Modals and sheets use backdrop blur
- [ ] No heavy/hard shadows
- [ ] Overlay background: rgba(0,0,0,0.4) or blur

### 7. Motion (if applicable)
- [ ] Duration: 200–350ms for standard transitions
- [ ] Easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (Apple ease-out)
- [ ] Avoid animating raw color values — use opacity/transform instead

---

## Workflow

### When the user wants a UI review
1. Receive: screenshot / description / existing code
2. Run through the checklist above
3. List deviations + reason + specific recommended value
4. Prioritize by impact: touch target > contrast > spacing > visual polish

### When the user wants component code
1. Clarify: React (web) or React Native?
2. Read `references/code.md` for the correct platform template
3. Apply tokens from Quick Reference above
4. Always include: dark mode support, accessibility props, hover/focus states

### When the user asks about a specific token
→ Answer directly from Quick Reference — no need to read additional files
→ If dark mode variant is needed → read `references/tokens.md`