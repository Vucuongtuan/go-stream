# Apple HIG — Review Guide

## How to analyze UI against HIG

### 1. Read the overall layout first
Look for:
- Is the visual hierarchy clear? (primary → secondary → tertiary)
- Any areas that feel crowded and need breathing room?
- Does the navigation pattern match the platform?

### 2. Evaluate each layer

#### Layer 1 — Structural (highest priority)
| Issue | HIG Standard | Why it matters |
|---|---|---|
| Touch target < 44px | ≥ 44×44px | Users will mis-tap |
| Text < 15px | Body ≥ 17px, min 13px | Accessibility, readability |
| Content margin < 16px | ≥ 16px on mobile | Feels claustrophobic |
| No clear primary action | 1 obvious primary action per screen | Reduces decision fatigue |

#### Layer 2 — Visual Language
| Issue | HIG Standard | Fix |
|---|---|---|
| Inconsistent border radius | Use one consistent scale | Pick one: 8/12/16/20px |
| Too many colors | Max 2–3 dominant colors | Use semantic system colors |
| Heavy shadows | Subtle, multi-layer shadows | Use the shadow templates |
| Inconsistent font weights | Regular / Semibold / Bold | Max 3 weights |

#### Layer 3 — Polish
| Issue | Fix |
|---|---|
| No dark mode | Use CSS custom properties |
| Missing focus states | Add `ring-2 ring-[#007AFF]` |
| No empty state | Add empty state with icon + message |
| No loading feedback | Skeleton loader / spinner |

---

## Common Mistakes

### ❌ Border radius not on a scale
```
Button: 6px, Card: 10px, Modal: 18px, Input: 5px
```
→ Looks random, no system

✅ Fix:
```
Button: 12px, Card: 16px, Modal: 20px, Input: 10px
```
Radius increases with element size — this is Apple's principle.

---

### ❌ Arbitrary colors instead of semantic ones
```css
color: #1a73e8; /* Google Blue crept in */
color: #0066cc; /* Made up */
```

✅ Fix:
```css
color: #007AFF; /* systemBlue */
```

---

### ❌ Spacing not on a grid
```
padding: 14px 11px;
margin-bottom: 7px;
```

✅ Fix:
```
padding: 12px;      /* or 16px */
margin-bottom: 8px;
```

---

### ❌ Low text contrast
```css
color: rgba(0,0,0,0.4); /* used for body text */
```
→ ~2.5:1 ratio, fails WCAG AA

✅ Fix:
- Body text: `rgba(0,0,0,1)` or the label color token
- Secondary: `rgba(60,60,67,0.6)` — passes AA at 17px+
- Placeholder/disabled: `rgba(60,60,67,0.3)` — acceptable since it's not content

---

### ❌ Missing backdrop blur on modals
```css
background: rgba(0,0,0,0.5);
```

✅ HIG style:
```css
background: rgba(0,0,0,0.4);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
```

---

## Review output format

When returning a review, use this structure:

```
## Review Results

### ✅ Already HIG-compliant
- [good points]

### ⚠️ Needs improvement
1. **[Issue]** — [Short explanation]
   - Current: `[current value]`
   - Suggested: `[HIG-correct value]`

### 🔧 Quick fixes
[Short code snippet if applicable]
```