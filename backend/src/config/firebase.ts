import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.resolve(__dirname, 'firebase-service-account.json');

let messaging: any = null;

try {
  if (fs.existsSync(serviceAccountPath) || process.env.FIREBASE_SERVICE_ACCOUNT) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } else {
      credential = cert(serviceAccountPath);
    }
    
    initializeApp({ credential });
    console.log('Firebase Admin initialized successfully');
    messaging = getMessaging();
  } else {
    console.warn('Firebase Admin skipped: No service account or FIREBASE_SERVICE_ACCOUNT env var found.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

export { messaging };

