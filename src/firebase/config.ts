import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyCXF7ZXTrgfdMApLF4kZAwiFpL8baTdBc4",
  authDomain: "studio-2729619248-93d9f.firebaseapp.com",
  projectId: "studio-2729619248-93d9f",
  storageBucket: "studio-2729619248-93d9f.appspot.com",
  messagingSenderId: "255814188362",
  appId: "1:255814188362:web:ee6527ab26a1811a7c95b3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);
