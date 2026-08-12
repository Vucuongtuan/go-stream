import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';

import { TCta, TText } from '@/components/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { cn } from '@/lib/cn';

export default function PrivacyScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const [isProfilePrivate, setIsProfilePrivate] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const surfaceClassName =
    resolvedTheme === 'dark' ? 'bg-theme-surface-dark' : 'bg-theme-surface-light';

  return (
    <TCta
      tag={ScrollView}
      className="flex-1"
      contentContainerClassName="gap-6 px-5 pb-10 pt-6"
      contentInsetAdjustmentBehavior="automatic">
      <View className="gap-2">
        <TText className="text-3xl font-extrabold tracking-tight">Privacy</TText>
        <TText className="text-base leading-6 opacity-65">Kiểm soát cách mọi người tìm thấy và tương tác với bạn trên GO Stream.</TText>
      </View>

      <View className={cn('gap-5 rounded-3xl p-5', surfaceClassName)}>
        <View className="flex-row items-center gap-4">
          <View className="flex-1 gap-1">
            <TText className="text-base font-bold">Tài khoản riêng tư</TText>
            <TText className="text-sm leading-5 opacity-65">Chỉ người theo dõi được chấp nhận mới xem được hoạt động của bạn.</TText>
          </View>
          <Switch
            onValueChange={setIsProfilePrivate}
            thumbColor="#FFFFFF"
            trackColor={{ false: resolvedTheme === 'dark' ? '#4A5054' : '#C9CED1', true: colors.tint }}
            value={isProfilePrivate}
          />
        </View>
        <View className="h-px bg-black/10 dark:bg-white/10" />
        <View className="flex-row items-center gap-4">
          <View className="flex-1 gap-1">
            <TText className="text-base font-bold">Trạng thái hoạt động</TText>
            <TText className="text-sm leading-5 opacity-65">Cho phép người khác biết khi bạn đang online hoặc xem stream.</TText>
          </View>
          <Switch
            onValueChange={setShowActivity}
            thumbColor="#FFFFFF"
            trackColor={{ false: resolvedTheme === 'dark' ? '#4A5054' : '#C9CED1', true: colors.tint }}
            value={showActivity}
          />
        </View>
      </View>

      <View className="gap-2 px-1">
        <TText className="text-sm font-bold">Ghi chú</TText>
        <TText className="text-sm leading-5 opacity-60">Các lựa chọn này hiện được lưu trên thiết bị cho bản demo; sẽ đồng bộ vào tài khoản khi profile API được kết nối.</TText>
      </View>
    </TCta>
  );
}
