import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { Link, router } from 'expo-router';

import { AuthInput } from '@/components/auth/auth-input';
import { TCta, TText } from '@/components/theme';
import { getAuthErrorMessage, register } from '@/lib/auth';
import { normalizeEmail, validateRegistrationInput } from '@/lib/auth-validation';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (isSubmitting) return;

    const validationError = validateRegistrationInput(name, email, password, confirmPassword);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await register(name.trim(), normalizeEmail(email), password);
      router.replace('/(tabs)');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TCta tag={KeyboardAvoidingView} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-7 px-6 pb-10 pt-14"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled">
        <View className="gap-5">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand">
            <MaterialIcons color="#FFFFFF" name="person-add-alt-1" size={28} />
          </View>
          <View className="gap-2">
            <TText className="text-4xl font-extrabold tracking-tight">Tạo tài khoản</TText>
            <TText className="text-base leading-6 opacity-65">Tham gia GO Stream để theo dõi và trò chuyện cùng cộng đồng.</TText>
          </View>
        </View>

        <View className="gap-4">
          <View className="gap-2">
            <TText className="text-sm font-bold">Tên hiển thị</TText>
            <AuthInput autoComplete="name" editable={!isSubmitting} maxLength={50} onChangeText={setName} placeholder="Tên của bạn" value={name} />
          </View>
          <View className="gap-2">
            <TText className="text-sm font-bold">Email</TText>
            <AuthInput autoCapitalize="none" autoComplete="email" editable={!isSubmitting} keyboardType="email-address" onChangeText={setEmail} placeholder="you@example.com" value={email} />
          </View>
          <View className="gap-2">
            <TText className="text-sm font-bold">Mật khẩu</TText>
            <AuthInput autoComplete="new-password" editable={!isSubmitting} maxLength={72} onChangeText={setPassword} placeholder="Tối thiểu 8 ký tự" secureTextEntry value={password} />
          </View>
          <View className="gap-2">
            <TText className="text-sm font-bold">Xác nhận mật khẩu</TText>
            <AuthInput autoComplete="new-password" editable={!isSubmitting} maxLength={72} onChangeText={setConfirmPassword} placeholder="Nhập lại mật khẩu" secureTextEntry value={confirmPassword} />
          </View>
          <View className="relative mt-2">
            {errorMessage ? (
              <TText
                accessibilityLiveRegion="polite"
                className="absolute bottom-full left-0 right-0 text-sm leading-5 text-red-500"
                numberOfLines={1}>
                {errorMessage}
              </TText>
            ) : null}
            <Pressable accessibilityRole="button" className="h-14 items-center justify-center rounded-2xl bg-brand disabled:opacity-55" disabled={isSubmitting} onPress={handleRegister}>
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <TText className="font-bold text-white">Tạo tài khoản</TText>}
            </Pressable>
          </View>
        </View>

        <Link href="../login" asChild>
          <Pressable accessibilityRole="button" className="items-center p-3 disabled:opacity-45" disabled={isSubmitting}>
            <TText className="text-sm opacity-70">Đã có tài khoản? <TText className="font-bold text-brand">Đăng nhập</TText></TText>
          </Pressable>
        </Link>
      </ScrollView>
    </TCta>
  );
}
