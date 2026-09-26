/**
 * `checker` bygger avbockningssidan: bara Tasks-fliken, ingen inloggning och ingen planering.
 * Sätts med EXPO_PUBLIC_APP_MODE=checker (se npm-skriptet build:checker).
 */
export const APP_MODE: 'admin' | 'checker' =
  process.env.EXPO_PUBLIC_APP_MODE === 'checker' ? 'checker' : 'admin';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

/** Utan Firebase-uppgifter körs appen i demoläge med data sparad lokalt på enheten. */
export const HAS_FIREBASE = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
