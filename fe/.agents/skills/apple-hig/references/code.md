# Apple HIG — Code Component Templates

## React (Web)

### Button Component

```tsx
// ui/ios-button/ios-button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'tinted'
type Size = 'sm' | 'md' | 'lg'

interface IOSButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:     'bg-[#007AFF] text-white hover:bg-[#0071E3] active:bg-[#0068CC]',
  secondary:   'bg-[#F2F2F7] text-[#007AFF] hover:bg-[#E5E5EA] active:bg-[#D1D1D6]',
  destructive: 'bg-[#FF3B30] text-white hover:bg-[#E0352B] active:bg-[#CC3026]',
  ghost:       'bg-transparent text-[#007AFF] hover:bg-[rgba(0,122,255,0.08)] active:bg-[rgba(0,122,255,0.16)]',
  tinted:      'bg-[rgba(0,122,255,0.12)] text-[#007AFF] hover:bg-[rgba(0,122,255,0.18)]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-[15px] rounded-[10px] min-w-[44px]',
  md: 'h-[44px] px-5 text-[17px] rounded-[12px] min-w-[44px]',
  lg: 'h-[50px] px-6 text-[17px] rounded-[14px] min-w-[44px]',
}

export const IOSButton = forwardRef<HTMLButtonElement, IOSButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-semibold',
          'transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          'select-none outline-none',
          'focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2',
          'disabled:opacity-40 disabled:pointer-events-none',
          'active:scale-[0.97]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
IOSButton.displayName = 'IOSButton'
```

### Card Component

```tsx
// ui/ios-card/ios-card.tsx
import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type CardElevation = 'flat' | 'raised' | 'floating'

interface IOSCardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation
  grouped?: boolean // dùng grouped background system
}

const elevationStyles: Record<CardElevation, string> = {
  flat:     'shadow-none',
  raised:   'shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]',
  floating: 'shadow-[0_4px_16px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.08)]',
}

export const IOSCard = forwardRef<HTMLDivElement, IOSCardProps>(
  ({ elevation = 'raised', grouped = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[16px] overflow-hidden',
          grouped ? 'bg-white dark:bg-[#1C1C1E]' : 'bg-white dark:bg-[#1C1C1E]',
          elevationStyles[elevation],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
IOSCard.displayName = 'IOSCard'
```

### List / Cell Component (iOS style)

```tsx
// features/ios-list/ios-list-item.tsx
import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface IOSListItemProps extends HTMLAttributes<HTMLDivElement> {
  leading?: ReactNode    // icon bên trái
  trailing?: ReactNode  // value / chevron bên phải
  title: string
  subtitle?: string
  showSeparator?: boolean
}

export function IOSListItem({
  leading,
  trailing,
  title,
  subtitle,
  showSeparator = true,
  className,
  ...props
}: IOSListItemProps) {
  return (
    <div
      className={cn(
        'relative flex items-center min-h-[44px] px-4 py-3 gap-3',
        'bg-white dark:bg-[#1C1C1E]',
        'active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E]',
        'transition-colors duration-[150ms]',
        className,
      )}
      {...props}
    >
      {leading && (
        <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
          {leading}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[17px] leading-[22px] text-[#000] dark:text-white truncate">
          {title}
        </p>
        {subtitle && (
          <p className="text-[15px] leading-[20px] text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.6)] truncate">
            {subtitle}
          </p>
        )}
      </div>

      {trailing && (
        <div className="flex-shrink-0 text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.6)]">
          {trailing}
        </div>
      )}

      {showSeparator && (
        <div className="absolute bottom-0 left-4 right-0 h-px bg-[rgba(60,60,67,0.29)] dark:bg-[rgba(84,84,88,0.65)]" />
      )}
    </div>
  )
}
```

### Modal / Sheet

```tsx
// features/ios-sheet/ios-sheet.tsx
'use client'
import { useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface IOSSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  snapPoint?: 'half' | 'full' | 'auto'
}

export function IOSSheet({ open, onClose, children, title, snapPoint = 'auto' }: IOSSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 250ms cubic-bezier(0.25,0.46,0.45,0.94)' }}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-[#F2F2F7] dark:bg-[#1C1C1E]',
          'rounded-t-[20px] overflow-hidden',
          'shadow-[0_-4px_32px_rgba(0,0,0,0.16)]',
          snapPoint === 'half' && 'max-h-[50vh]',
          snapPoint === 'full' && 'max-h-[92vh]',
          snapPoint === 'auto' && 'max-h-[85vh]',
        )}
        style={{ animation: 'slideUp 350ms cubic-bezier(0.25,0.46,0.45,0.94)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-[rgba(60,60,67,0.3)] dark:bg-[rgba(235,235,245,0.3)]" />
        </div>

        {title && (
          <div className="px-4 pb-3 border-b border-[rgba(60,60,67,0.29)] dark:border-[rgba(84,84,88,0.65)]">
            <h2 className="text-[17px] font-semibold text-center text-[#000] dark:text-white">
              {title}
            </h2>
          </div>
        )}

        <div className="overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}
```

### Toggle / Switch

```tsx
// ui/ios-toggle/ios-toggle.tsx
'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface IOSToggleProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  color?: string
}

export function IOSToggle({
  checked: controlledChecked,
  onChange,
  disabled = false,
  color = '#34C759',
}: IOSToggleProps) {
  const [internalChecked, setInternalChecked] = useState(false)
  const isChecked = controlledChecked ?? internalChecked

  const handleClick = () => {
    if (disabled) return
    const next = !isChecked
    setInternalChecked(next)
    onChange?.(next)
  }

  return (
    <button
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative w-[51px] h-[31px] rounded-full',
        'transition-colors duration-[250ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#007AFF]',
        'disabled:opacity-40 disabled:pointer-events-none',
        isChecked ? `bg-[${color}]` : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]',
      )}
      style={{ backgroundColor: isChecked ? color : undefined }}
    >
      <span
        className={cn(
          'absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white',
          'shadow-[0_2px_6px_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.15)]',
          'transition-transform duration-[250ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          isChecked && 'translate-x-[20px]',
        )}
      />
    </button>
  )
}
```

---

## React Native

### Button (React Native)

```tsx
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'

type Variant = 'primary' | 'secondary' | 'destructive'

interface IOSButtonProps {
  title: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  fullWidth?: boolean
}

export function IOSButton({ title, onPress, variant = 'primary', disabled, fullWidth }: IOSButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, styles[`${variant}Label` as keyof typeof styles] as TextStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  } as ViewStyle,
  primary:     { backgroundColor: '#007AFF' } as ViewStyle,
  secondary:   { backgroundColor: '#F2F2F7' } as ViewStyle,
  destructive: { backgroundColor: '#FF3B30' } as ViewStyle,
  fullWidth:   { width: '100%' } as ViewStyle,
  disabled:    { opacity: 0.4 } as ViewStyle,
  label:       { fontSize: 17, fontWeight: '600' } as TextStyle,
  primaryLabel:     { color: '#FFFFFF' } as TextStyle,
  secondaryLabel:   { color: '#007AFF' } as TextStyle,
  destructiveLabel: { color: '#FFFFFF' } as TextStyle,
})
```

### List Cell (React Native)

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ReactNode } from 'react'

interface IOSCellProps {
  title: string
  subtitle?: string
  leading?: ReactNode
  trailing?: ReactNode
  onPress?: () => void
  showSeparator?: boolean
}

export function IOSCell({ title, subtitle, leading, trailing, onPress, showSeparator = true }: IOSCellProps) {
  const Wrapper = onPress ? TouchableOpacity : View

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      {leading && <View style={styles.leading}>{leading}</View>}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {trailing && <View style={styles.trailing}>{trailing}</View>}

      {showSeparator && <View style={styles.separator} />}
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  leading: { marginRight: 12, width: 28, alignItems: 'center' },
  content: { flex: 1 },
  trailing: { marginLeft: 8 },
  title: { fontSize: 17, color: '#000000' },
  subtitle: { fontSize: 15, color: 'rgba(60,60,67,0.6)', marginTop: 2 },
  separator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.29)',
  },
})
```

---

## Patterns hay gặp

### Grouped List Section (giống Settings app)

```tsx
// Web
function GroupedSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="px-4">
      {title && (
        <p className="text-[13px] text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.6)] uppercase tracking-wide px-4 py-2">
          {title}
        </p>
      )}
      <div className="rounded-[10px] overflow-hidden divide-y divide-[rgba(60,60,67,0.29)]">
        {children}
      </div>
    </div>
  )
}
```

### Navigation Bar

```tsx
function IOSNavBar({ title, backLabel, onBack, trailing }: {
  title: string
  backLabel?: string
  onBack?: () => void
  trailing?: ReactNode
}) {
  return (
    <div className="sticky top-0 z-30 h-[44px] flex items-center px-4 bg-white/80 dark:bg-black/80 backdrop-blur-[20px] backdrop-saturate-150 border-b border-[rgba(60,60,67,0.29)]">
      <div className="w-1/4">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-[#007AFF] text-[17px]">
            ‹ {backLabel || 'Back'}
          </button>
        )}
      </div>
      <h1 className="flex-1 text-center text-[17px] font-semibold truncate">
        {title}
      </h1>
      <div className="w-1/4 flex justify-end">{trailing}</div>
    </div>
  )
}
```