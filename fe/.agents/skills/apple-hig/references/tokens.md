# Apple HIG Design Tokens — Full Reference

## Color System — Light & Dark

### Semantic Colors
| Token | Light | Dark |
|---|---|---|
| systemBlue | #007AFF | #0A84FF |
| systemGreen | #34C759 | #30D158 |
| systemRed | #FF3B30 | #FF453A |
| systemOrange | #FF9500 | #FF9F0A |
| systemYellow | #FFCC00 | #FFD60A |
| systemPink | #FF2D55 | #FF375F |
| systemPurple | #AF52DE | #BF5AF2 |
| systemTeal | #5AC8FA | #64D2FF |
| systemIndigo | #5856D0 | #5E5CE6 |
| systemCyan | #32ADE6 | #32ADE6 |
| systemMint | #00C7BE | #63E6E2 |

### Gray Scale
| Token | Light | Dark |
|---|---|---|
| systemGray | #8E8E93 | #8E8E93 |
| systemGray2 | #AEAEB2 | #636366 |
| systemGray3 | #C7C7CC | #48484A |
| systemGray4 | #D1D1D6 | #3A3A3C |
| systemGray5 | #E5E5EA | #2C2C2E |
| systemGray6 | #F2F2F7 | #1C1C1E |

### Label Colors
| Token | Light | Dark |
|---|---|---|
| label | rgba(0,0,0,1.00) | rgba(255,255,255,1.00) |
| secondaryLabel | rgba(60,60,67,0.60) | rgba(235,235,245,0.60) |
| tertiaryLabel | rgba(60,60,67,0.30) | rgba(235,235,245,0.30) |
| quaternaryLabel | rgba(60,60,67,0.18) | rgba(235,235,245,0.18) |

### Background Colors
| Token | Light | Dark | Used for |
|---|---|---|---|
| systemBackground | #FFFFFF | #000000 | Primary background |
| secondarySystemBackground | #F2F2F7 | #1C1C1E | Grouped view bg |
| tertiarySystemBackground | #FFFFFF | #2C2C2E | Cards inside grouped |
| systemGroupedBackground | #F2F2F7 | #000000 | Grouped background |
| secondarySystemGroupedBackground | #FFFFFF | #1C1C1E | Cards in grouped |
| tertiarySystemGroupedBackground | #F2F2F7 | #2C2C2E | 3rd level |

### Fill Colors (for control backgrounds)
| Token | Light | Dark |
|---|---|---|
| systemFill | rgba(120,120,128,0.20) | rgba(120,120,128,0.36) |
| secondarySystemFill | rgba(120,120,128,0.16) | rgba(120,120,128,0.32) |
| tertiarySystemFill | rgba(118,118,128,0.12) | rgba(118,118,128,0.24) |
| quaternarySystemFill | rgba(116,116,128,0.08) | rgba(118,118,128,0.18) |

### Separator
| Token | Light | Dark |
|---|---|---|
| separator | rgba(60,60,67,0.29) | rgba(84,84,88,0.65) |
| opaqueSeparator | #C6C6C8 | #38383A |

---

## CSS Custom Properties Template

```css
:root {
  /* System Colors */
  --color-blue: #007AFF;
  --color-green: #34C759;
  --color-red: #FF3B30;
  --color-orange: #FF9500;
  --color-yellow: #FFCC00;
  --color-pink: #FF2D55;
  --color-purple: #AF52DE;
  --color-teal: #5AC8FA;
  --color-indigo: #5856D0;

  /* Grays */
  --color-gray: #8E8E93;
  --color-gray2: #AEAEB2;
  --color-gray3: #C7C7CC;
  --color-gray4: #D1D1D6;
  --color-gray5: #E5E5EA;
  --color-gray6: #F2F2F7;

  /* Labels */
  --label: rgba(0,0,0,1);
  --label-secondary: rgba(60,60,67,0.60);
  --label-tertiary: rgba(60,60,67,0.30);
  --label-quaternary: rgba(60,60,67,0.18);

  /* Backgrounds */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F2F2F7;
  --bg-tertiary: #FFFFFF;
  --bg-grouped: #F2F2F7;
  --bg-grouped-secondary: #FFFFFF;

  /* Fill */
  --fill-primary: rgba(120,120,128,0.20);
  --fill-secondary: rgba(120,120,128,0.16);

  /* Separator */
  --separator: rgba(60,60,67,0.29);
  --separator-opaque: #C6C6C8;

  /* Border Radius */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 28px;
  --radius-pill: 9999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-11: 44px; /* min touch target */

  /* Typography */
  --font-caption2: 11px;
  --font-caption1: 12px;
  --font-footnote: 13px;
  --font-subheadline: 15px;
  --font-callout: 16px;
  --font-body: 17px;
  --font-headline: 17px;
  --font-title3: 20px;
  --font-title2: 22px;
  --font-title1: 28px;
  --font-largetitle: 34px;

  /* Motion */
  --ease-apple: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-blue: #0A84FF;
    --color-green: #30D158;
    --color-red: #FF453A;
    --color-orange: #FF9F0A;
    --color-yellow: #FFD60A;
    --color-pink: #FF375F;
    --color-purple: #BF5AF2;
    --color-teal: #64D2FF;
    --color-indigo: #5E5CE6;

    --color-gray2: #636366;
    --color-gray3: #48484A;
    --color-gray4: #3A3A3C;
    --color-gray5: #2C2C2E;
    --color-gray6: #1C1C1E;

    --label: rgba(255,255,255,1);
    --label-secondary: rgba(235,235,245,0.60);
    --label-tertiary: rgba(235,235,245,0.30);
    --label-quaternary: rgba(235,235,245,0.18);

    --bg-primary: #000000;
    --bg-secondary: #1C1C1E;
    --bg-tertiary: #2C2C2E;
    --bg-grouped: #000000;
    --bg-grouped-secondary: #1C1C1E;

    --fill-primary: rgba(120,120,128,0.36);
    --fill-secondary: rgba(120,120,128,0.32);

    --separator: rgba(84,84,88,0.65);
    --separator-opaque: #38383A;
  }
}
```

---

## Tailwind Config Mapping

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'ios-blue': '#007AFF',
        'ios-green': '#34C759',
        'ios-red': '#FF3B30',
        'ios-orange': '#FF9500',
        'ios-gray': '#8E8E93',
        'ios-gray2': '#AEAEB2',
        'ios-gray3': '#C7C7CC',
        'ios-gray4': '#D1D1D6',
        'ios-gray5': '#E5E5EA',
        'ios-gray6': '#F2F2F7',
      },
      borderRadius: {
        'ios-xs': '4px',
        'ios-sm': '8px',
        'ios-md': '12px',
        'ios-lg': '16px',
        'ios-xl': '20px',
        'ios-2xl': '28px',
      },
      fontSize: {
        'ios-caption2': ['11px', { lineHeight: '13px' }],
        'ios-caption1': ['12px', { lineHeight: '16px' }],
        'ios-footnote': ['13px', { lineHeight: '18px' }],
        'ios-subheadline': ['15px', { lineHeight: '20px' }],
        'ios-callout': ['16px', { lineHeight: '21px' }],
        'ios-body': ['17px', { lineHeight: '22px' }],
        'ios-headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'ios-title3': ['20px', { lineHeight: '25px' }],
        'ios-title2': ['22px', { lineHeight: '28px' }],
        'ios-title1': ['28px', { lineHeight: '34px' }],
        'ios-largetitle': ['34px', { lineHeight: '41px' }],
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
}
```