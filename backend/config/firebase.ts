// src/config/firebaseAdmin.ts
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config(); // Đọc file .env

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '../serviceAccountKey.json';

try {
  // Sử dụng import() động hoặc require() cho JSON nếu gặp vấn đề với import tĩnh và moduleResolution
  // Với "resolveJsonModule": true trong tsconfig.json, import tĩnh nên hoạt động:
  // import serviceAccount from serviceAccountPath; // Điều này có thể không hoạt động trực tiếp với biến
  
  // Cách an toàn hơn khi đường dẫn là động:
  const serviceAccount = require(serviceAccountPath); // require vẫn hoạt động tốt cho JSON trong môi trường Node + CommonJS

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // databaseURL: "https://<DATABASE_NAME>.firebaseio.com" 
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  console.error(`Ensure your service account key is at path: ${serviceAccountPath} and is valid.`);
  process.exit(1);
}

export default admin;