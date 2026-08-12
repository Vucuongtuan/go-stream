import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthInput } from '@/components/auth/auth-input';
import { TCta, TText } from '@/components/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getAuthErrorMessage, login } from '@/lib/auth';
import { normalizeEmail, validateLoginInput } from '@/lib/auth-validation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colors } = useAppTheme();

  const handleLogin = async () => {
    if (isSubmitting) return;

    const validationError = validateLoginInput(email, password);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await login(normalizeEmail(email), password);
      router.replace('/(tabs)');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TCta tag={SafeAreaView} className="flex-1" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerClassName="flex-grow px-5 pb-7 pt-4"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand">
                <TText className="text-base font-black text-[#18181B]">G</TText>
              </View>
              <TText className="text-base font-black tracking-tight">GO Stream</TText>
            </View>
            <Pressable accessibilityRole="button" className="px-1 py-2 disabled:opacity-40" disabled={isSubmitting} onPress={() => router.replace('/(tabs)')}>
              <TText className="text-sm font-semibold" style={{ color: colors.muted }}>Để sau</TText>
            </Pressable>
          </View>

          <View className="mb-9 mt-12 gap-2">
            <TText className="text-[34px] font-black leading-[40px] tracking-tight">Chào mừng trở lại {process.env.EXPO_PUBLIC_API_URL}</TText>
            <TText className="text-[15px] leading-6" style={{ color: colors.muted }}>Đăng nhập để tiếp tục theo dõi những kênh bạn yêu thích.</TText>
          </View>

          <View className="gap-5">
            <View className="gap-2">
              <TText className="text-sm font-black">Email</TText>
              <AuthInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!isSubmitting}
                onChangeText={setEmail}
                placeholder="you@example.com"
                value={email}
              />
            </View>
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <TText className="text-sm font-black">Mật khẩu</TText>
                <TText className="text-xs" style={{ color: colors.muted }}>Ít nhất 8 ký tự</TText>
              </View>
              <AuthInput
                autoComplete="current-password"
                onChangeText={setPassword}
                editable={!isSubmitting}
                placeholder="Nhập mật khẩu"
                secureTextEntry
                value={password}
              />
            </View>

            {errorMessage ? (
              <View accessibilityLiveRegion="polite" className="flex-row items-center gap-2 rounded-xl bg-red-500/10 px-3 py-3">
                <TText className="flex-1 text-sm leading-5 text-red-500">{errorMessage}</TText>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              className="h-14 flex-row items-center justify-center rounded-2xl bg-brand active:opacity-90 disabled:opacity-55"
              disabled={isSubmitting}
              onPress={handleLogin}>
              {isSubmitting ? <ActivityIndicator color="#18181B" /> : <TText className="font-black text-[#18181B]">Đăng nhập</TText>}
            </Pressable>
          </View>

          <View className="mt-7 gap-3">
            <TText className="text-center text-sm" style={{ color: colors.muted }}>Chưa có tài khoản?</TText>
            <Link href="../register" asChild>
              <Pressable accessibilityRole="button" className="h-14 items-center justify-center rounded-2xl border active:opacity-70 disabled:opacity-45" disabled={isSubmitting} style={{ borderColor: colors.border }}>
                <TText className="font-black">Tạo tài khoản miễn phí</TText>
              </Pressable>
            </Link>
            <Pressable accessibilityRole="button" className="items-center py-2 disabled:opacity-45" disabled={isSubmitting} onPress={() => router.replace('/(tabs)')}>
              <TText className="text-sm font-semibold text-brand">Khám phá GO Stream trước</TText>
            </Pressable>
          </View>

          <View className="mt-auto items-center pt-8">
            <TText className="text-center text-xs leading-5" style={{ color: colors.muted }}>Bằng việc tiếp tục, bạn đồng ý với Điều khoản và Chính sách quyền riêng tư.</TText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TCta>
  );
}
