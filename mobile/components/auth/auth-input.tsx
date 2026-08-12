import type { ComponentProps } from 'react';
import { TextInput } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { cn } from '@/lib/cn';

type AuthInputProps = ComponentProps<typeof TextInput>;

export function AuthInput({ className, ...props }: AuthInputProps) {
  const { colors, resolvedTheme } = useAppTheme();
  const themeClassName =
    resolvedTheme === 'dark'
      ? 'bg-theme-surface-dark text-theme-foreground-dark'
      : 'bg-theme-surface-light text-theme-foreground-light';

  return (
    <TextInput
      {...props}
      className={cn('h-14 rounded-2xl px-4 text-base disabled:opacity-50', themeClassName, className)}
      placeholderTextColor={colors.muted}
    />
  );
}
