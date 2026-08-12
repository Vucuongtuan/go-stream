import { forwardRef, type ComponentRef, type ComponentPropsWithoutRef } from 'react';
import { Text as ReactNativeText } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

import { cn } from '../../lib/cn';

type TTextProps = ComponentPropsWithoutRef<typeof ReactNativeText>;
type TTextRef = ComponentRef<typeof ReactNativeText>;

const TText = forwardRef<TTextRef, TTextProps>(({ className, style, ...props }, ref) => {
  const { resolvedTheme } = useAppTheme();
  const textClassName =
    resolvedTheme === 'dark' ? 'text-theme-foreground-dark' : 'text-theme-foreground-light';

  return <ReactNativeText ref={ref} {...props} className={cn(textClassName, className)} style={style} />;
});

TText.displayName = 'TText';

export default TText;
