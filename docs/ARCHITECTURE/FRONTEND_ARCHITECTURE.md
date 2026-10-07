# 📱 Frontend Architecture (Mobile)

## Core Technologies
- **Framework**: React Native + Expo (bare workflow or managed with custom native modules supported).
- **Language**: TypeScript (strict mode enabled).
- **Styling**: Token-driven stylesheet architecture via central `useTheme()` hook.

## State Management Strategy
- **Auth & Session**: Encapsulated in `AuthContext` with secure storage persistence (`expo-secure-store` or async storage).
- **Real-time Gateway**: Managed via a singleton `SocketService` providing event subscriptions and automatic reconnection.
- **Server Cache & Queries**: Lightweight fetch wrappers with optimistic UI updates.
- **Game State**: Dedicated React reducers per game engine receiving authoritative state broadcast from backend sockets.

## Key Frontend Conventions
1. **Zero Inline Magic Values**: Colors, paddings, and font sizes must come from `theme.tokens`.
2. **SVG-Only Icon Registry**: Vector icons built with `react-native-svg` accepting `color` and `size`.
3. **Hardware Back Button Handling**: Handled consistently on Android using `BackHandler` listeners.
4. **Virtualization**: Use `FlatList` or `FlashList` with `getItemLayout` for chat and friend lists.
