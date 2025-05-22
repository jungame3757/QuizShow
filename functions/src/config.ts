import * as admin from 'firebase-admin';

// Firebase Admin SDK 초기화 (Cloud Functions 환경에서는 자동으로 한 번만 실행됨)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Admin SDK를 통한 Firestore 인스턴스
export const adminFirestore = admin.firestore();

// Admin SDK를 통한 Realtime Database 인스턴스
export const adminRtdb = admin.database(); 