// @firebase/auth listar sina webbtyper före react-native-typerna i "exports", så TypeScript
// hittar inte getReactNativePersistence. Funktionen finns i React Native-bygget som Metro laddar.
import type { Persistence, ReactNativeAsyncStorage } from '@firebase/auth';

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
