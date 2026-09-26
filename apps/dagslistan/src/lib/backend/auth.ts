import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// På webben sparar Firebase inloggningen i webbläsaren av sig självt.
export function createAuth(app: FirebaseApp) {
  return getAuth(app);
}
