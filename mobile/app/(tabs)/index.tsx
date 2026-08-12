import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeTopTabBar } from '@/components/home/home-top-tab-bar';
import Image from '@/components/Image';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api-client';

const TopTabs = createMaterialTopTabNavigator();

type User = { name: string; slug: string; avatar?: string };
type Room = { id: number; title: string; thumbnail?: string; viewer_count: number; host: User; category?: { name: string }; game?: { name: string } };
type Video = { id: number; title: string; thumbnail_url?: string; view_count: number; author?: { display_name: string; user?: User } };
type Author = { id: number; display_name: string; avatar?: string; follower_count: number; user: User };

export default function HomeScreen() {
  const { colors } = useAppTheme();
  return <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: colors.background }}><TopTabs.Navigator screenOptions={{ swipeEnabled: false }} tabBar={HomeTopTabBar}><TopTabs.Screen component={FollowingTab} name="Follows" /><TopTabs.Screen component={LiveTab} name="Live" /><TopTabs.Screen component={ShortTab} name="Short" /></TopTabs.Navigator></SafeAreaView>;
}

function LiveTab() {
  const query = useQuery({ queryKey: ['live-rooms'], queryFn: () => api.get<Room[]>('/api/rooms') });
  return <FeedShell title="Live now" query={query}>{(rooms) => <View className="gap-4">{rooms.map((room) => <LiveCard key={room.id} room={room} />)}</View>}</FeedShell>;
}

function FollowingTab() {
  const query = useQuery({ queryKey: ['followed-authors'], queryFn: () => api.get<Author[]>('/api/authors/following') });
  return <FeedShell title="Following" query={query} empty="Bạn chưa theo dõi kênh nào.">{(authors) => <View className="gap-3">{authors.map((author) => <View key={author.id} className="flex-row items-center rounded-2xl p-4" style={{ backgroundColor: '#17171A' }}><View className="h-12 w-12 overflow-hidden rounded-full bg-brand">{author.avatar ? <Image src={author.avatar} style={{ height: '100%', width: '100%' }} /> : <Text className="p-3 text-center text-lg font-black">{author.display_name[0]}</Text>}</View><View className="ml-3 flex-1"><Text className="text-base font-bold text-white">{author.display_name}</Text><Text className="mt-1 text-sm text-zinc-400">@{author.user.slug} · {author.follower_count} followers</Text></View><MaterialIcons color="#53FC18" name="chevron-right" size={22} /></View>)}</View>}</FeedShell>;
}

function ShortTab() {
  const query = useQuery({ queryKey: ['short-videos'], queryFn: () => api.get<Video[]>('/api/videos/feed?limit=30') });
  return <FeedShell title="Shorts" query={query} empty="Chưa có short nào để xem.">{(videos) => <View className="flex-row flex-wrap gap-2">{videos.map((video) => <View key={video.id} className="w-[48.8%] overflow-hidden rounded-2xl" style={{ backgroundColor: '#17171A' }}><View className="aspect-[9/13] bg-zinc-800">{video.thumbnail_url ? <Image src={video.thumbnail_url} style={{ height: '100%', width: '100%' }} /> : <View className="flex-1 items-center justify-center"><MaterialIcons color="#53FC18" name="play-circle-outline" size={38} /></View>}</View><View className="gap-1 p-3"><Text className="font-bold text-white" numberOfLines={2}>{video.title}</Text><Text className="text-xs text-zinc-400" numberOfLines={1}>{video.author?.display_name ?? 'GO Stream'} · {video.view_count} views</Text></View></View>)}</View>}</FeedShell>;
}

function FeedShell({ title, query, empty, children }: { title: string; query: any; empty?: string; children: (items: any[]) => React.ReactNode }) {
  const { colors } = useAppTheme();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 112, paddingHorizontal: 20, paddingTop: 128 }}><View className="mb-5 flex-row items-center justify-between"><Text className="text-2xl font-black" style={{ color: colors.text }}>{title}</Text><Pressable onPress={() => query.refetch()}><MaterialIcons color={colors.tint} name="refresh" size={22} /></Pressable></View>{query.isLoading ? <View className="py-16"><ActivityIndicator color={colors.tint} /></View> : query.isError ? <View className="items-center gap-3 py-16"><Text className="text-center" style={{ color: colors.muted }}>Không tải được dữ liệu. Kiểm tra lại kết nối API.</Text><Pressable className="rounded-xl bg-brand px-4 py-3" onPress={() => query.refetch()}><Text className="font-bold text-black">Thử lại</Text></Pressable></View> : query.data?.length ? children(query.data) : <View className="items-center gap-2 rounded-3xl py-12" style={{ backgroundColor: colors.surface }}><MaterialIcons color={colors.tint} name="explore" size={32} /><Text className="font-bold" style={{ color: colors.text }}>{empty ?? 'Chưa có livestream nào.'}</Text></View>}</ScrollView>;
}

function LiveCard({ room }: { room: Room }) {
  const { colors } = useAppTheme();
  return <View className="gap-2"><View className="aspect-video overflow-hidden rounded-2xl bg-zinc-800">{room.thumbnail ? <Image src={room.thumbnail} style={{ height: '100%', width: '100%' }} /> : <View className="flex-1 items-center justify-center"><MaterialIcons color="#53FC18" name="live-tv" size={38} /></View>}<View className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-1"><Text className="text-[10px] font-black text-white">LIVE</Text></View><View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-full bg-black/60 px-2 py-1"><MaterialIcons color="#53FC18" name="visibility" size={14} /><Text className="text-xs font-bold text-white">{room.viewer_count}</Text></View></View><Text className="text-base font-bold" numberOfLines={2} style={{ color: colors.text }}>{room.title}</Text><Text className="text-sm" style={{ color: colors.muted }}>{room.host?.name ?? 'GO Stream'} · {room.game?.name ?? room.category?.name ?? 'Live'}</Text></View>;
}
