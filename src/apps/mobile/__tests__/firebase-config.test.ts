// RF-140: `initializeApp` recibe los valores del entorno, sin mockear la lectura de las variables.
import { initializeApp } from "firebase/app";

import { enviarMailRecuperacion } from "../src/lib/firebase";

jest.mock("firebase/app", () => ({ initializeApp: jest.fn(() => ({})) }), { virtual: true });
jest.mock(
  "firebase/auth",
  () => ({
    initializeAuth: () => ({}),
    getReactNativePersistence: jest.fn(),
    connectAuthEmulator: jest.fn(),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true },
);
jest.mock(
  "@react-native-google-signin/google-signin",
  () => ({ GoogleSignin: { configure: jest.fn() } }),
  { virtual: true },
);

describe("RF-140 configuración de Firebase leída del entorno", () => {
  it("initializeApp recibe apiKey, authDomain, projectId y appId definidos en el entorno", async () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = "key-test";
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = "dominio-test.firebaseapp.com";
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = "proyecto-test";
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = "app-id-test";
    await enviarMailRecuperacion("ana@rumbo.test");
    expect(initializeApp).toHaveBeenCalledWith({
      apiKey: "key-test",
      authDomain: "dominio-test.firebaseapp.com",
      projectId: "proyecto-test",
      appId: "app-id-test",
    });
  });
});
