import { createElement, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react';
import { type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

import { cn } from '../../lib/cn';

type ThemeContainerProps<C extends ElementType> = {
  tag: C;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<C>, 'children'>;

type ThemeStyleProps = {
  className?: string;
  style?: StyleProp<ViewStyle | TextStyle>;
};

export default function TCta<C extends ElementType>({
  tag: Component,
  children,
  ...props
}: ThemeContainerProps<C>) {
  const { resolvedTheme } = useAppTheme();
  const componentProps = props as ThemeStyleProps;
  const backgroundClassName =
    resolvedTheme === 'dark' ? 'bg-theme-background-dark' : 'bg-theme-background-light';

  return createElement(
    Component,
    {
      ...props,
      className: cn(backgroundClassName, componentProps.className),
      style: componentProps.style,
    } as ComponentPropsWithoutRef<C>,
    children
  );
}
