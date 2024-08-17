// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAklMrJioaJPCkU6pT8W7Yq0IfsQ0h3o88",
  authDomain: "uiuc-course-hub.firebaseapp.com",
  projectId: "uiuc-course-hub",
  storageBucket: "uiuc-course-hub.appspot.com",
  messagingSenderId: "74220647977",
  appId: "1:74220647977:web:ab544bacd4aa400960ce38",
  measurementId: "G-PWWS2YBZE0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);