import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

import { useAppTheme } from '@/hooks/use-app-theme';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const inactiveColor = colors.muted;

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      iconColor={{ default: inactiveColor, selected: colors.tint }}
      indicatorColor={colors.select}
      rippleColor={colors.tint}
      tintColor={colors.tint}
      labelVisibilityMode='selected'
      
      backBehavior='history'
      blurEffect='systemDefault'
      // minimizeBehavior=
      >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house.fill" androidSrc={<VectorIcon family={Ionicons} name="home" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ranking">
        <Label>Ranking</Label>
        <Icon sf="trophy.fill" androidSrc={<VectorIcon family={Ionicons} name="trophy" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <Icon sf="magnifyingglass" androidSrc={<VectorIcon family={Ionicons} name="search" />} />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notification">
        <Label>Notification</Label>
        <Icon sf="bell.fill" androidSrc={<VectorIcon family={Ionicons} name="notifications" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <Icon sf="person.fill" androidSrc={<VectorIcon family={Ionicons} name="person" />} />
        <Label>Me</Label>
      </NativeTabs.Trigger>
   
    </NativeTabs>
  );
}
