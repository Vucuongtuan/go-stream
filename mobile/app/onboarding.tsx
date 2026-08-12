import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TCta, TText } from '@/components/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { completeOnboarding } from '@/lib/onboarding';
import Image from '@/components/Image';

const slides = [
  {
    image: require('@/assets/images/onboading-1.png'),
    eyebrow: 'TRỰC TIẾP, MỖI NGÀY',
    title: 'Bắt trọn những gì đang diễn ra',
    description: 'Khám phá stream, game và những cộng đồng đang lên sóng theo đúng gu của bạn.',
  },
  {
    image: require('@/assets/images/onboading-2.png'),
    eyebrow: 'THEO DÕI ĐÚNG GU',
    title: 'Đừng lỡ kênh bạn yêu thích',
    description: 'Nhận thông báo khi streamer lên sóng và ghé vào ngay khi cuộc vui bắt đầu.',
  },
  {
    image: require('@/assets/images/onboading-3.png'),
    eyebrow: 'CÙNG THAM GIA',
    title: 'Xem chung, trò chuyện thật',
    description: 'Thả cảm xúc, tán gẫu cùng mọi người và tạo nhịp riêng cho từng buổi stream.',
  },
  {
    image: require('@/assets/images/onboading-4.png'),
    eyebrow: 'SẴN SÀNG LÊN SÓNG',
    title: 'Cộng đồng đang chờ bạn',
    description: 'Vào GO Stream để xem, kết nối hoặc tự tạo sân khấu cho câu chuyện của mình.',
  },
] as const;

export default function OnboardingScreen() {
  const [slideIndex, setSlideIndex] = useState(0);
  const { colors, resolvedTheme } = useAppTheme();
  const slide = slides[slideIndex];
  const isLastSlide = slideIndex === slides.length - 1;

  const finishOnboarding = (destination: Href = '/(tabs)') => {
    completeOnboarding();
    router.replace(destination);
  };

  return (
    <TCta tag={SafeAreaView} className="flex-1" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pb-4 pt-3">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand">
              <TText className="text-sm font-black text-white">G</TText>
            </View>
            <TText className="text-base font-black tracking-tight">GO Stream</TText>
          </View>
          {!isLastSlide && (
            <Pressable
              accessibilityHint="Kết thúc phần giới thiệu"
              accessibilityRole="button"
              className="rounded-full border px-4 py-2"
              style={{ borderColor: colors.border }}
              onPress={() => finishOnboarding()}>
              <TText className="text-xs font-bold" style={{ color: colors.muted }}>Bỏ qua</TText>
            </Pressable>
          )}
        </View>

        <View className="flex-1 justify-center">
          <View className="overflow-hidden rounded-[32px]" style={[styles.visualCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Image accessible={false} contentFit="cover" src={slide.image} style={styles.heroImage} />
            <LinearGradient
              colors={['transparent', resolvedTheme === 'dark' ? 'rgba(11,11,13,0.76)' : 'rgba(24,24,27,0.46)']}
              locations={[0.45, 1]}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View className="absolute bottom-5 left-5 rounded-full bg-white/90 px-3 py-2 dark:bg-black/50">
              <TText className="text-xs font-black tracking-wider text-[#18181B] dark:text-brand">GO STREAM</TText>
            </View>
          </View>

          <View className="mt-7 gap-4 px-1">
            <View className="flex-row items-center gap-3">
              <View className="h-px w-7 bg-brand" />
              <TText className="text-xs font-black tracking-[1.8px] text-brand">{slide.eyebrow}</TText>
            </View>
            <TText className="text-[34px] font-black leading-[40px] tracking-tight">{slide.title}</TText>
            <TText className="max-w-[340px] text-[15px] leading-6" style={{ color: colors.muted }}>{slide.description}</TText>
          </View>
        </View>

        <View className="gap-5 pt-5">
          <View className="flex-row items-center justify-between">
            <TText className="text-xs font-bold" style={{ color: colors.muted }}>0{slideIndex + 1} / 0{slides.length}</TText>
            <View className="flex-row gap-1.5">
              {slides.map((item, index) => (
                <View
                  key={item.eyebrow}
                  className={index === slideIndex ? 'h-2 w-7 rounded-full bg-brand' : 'h-2 w-2 rounded-full'}
                  style={index === slideIndex ? undefined : { backgroundColor: colors.border }}
                />
              ))}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            className="h-14 flex-row items-center justify-center rounded-2xl bg-brand active:opacity-90"
            onPress={isLastSlide ? () => finishOnboarding() : () => setSlideIndex((index) => index + 1)}>
            <TText className="font-black text-[#18181B]">{isLastSlide ? 'Khám phá GO Stream' : 'Tiếp tục'}</TText>
            <TText className="ml-2 text-lg font-black text-[#18181B]">→</TText>
          </Pressable>
          {isLastSlide && (
            <Pressable accessibilityRole="button" className="items-center py-1" onPress={() => finishOnboarding('/login' as Href)}>
              <TText className="text-sm font-bold text-brand">Tôi đã có tài khoản</TText>
            </Pressable>
          )}
        </View>
      </View>
    </TCta>
  );
}

const styles = StyleSheet.create({
  heroImage: { height: '100%', width: '100%' },
  visualCard: {
    aspectRatio: 0.98,
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
});
