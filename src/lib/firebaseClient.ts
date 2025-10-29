// Firebase client shim - modular imports for React Native Firebase v23+
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getCrashlytics } from '@react-native-firebase/crashlytics';

export const app = getApp();
export const auth = getAuth(app);
export const crashlytics = getCrashlytics(app);
