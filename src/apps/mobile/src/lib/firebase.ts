import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { initializeApp } from "firebase/app";
import {
  type Auth,
  connectAuthEmulator,
  getReactNativePersistence,
  GoogleAuthProvider,
  initializeAuth,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

/**
 * Único punto de contacto con Firebase Authentication en la app (DEC-0016): Firebase autentica y
 * la autorización queda en la API. La config pública sale de las `EXPO_PUBLIC_*` (ver `.env.example`).
 */
let instancia: Auth | undefined;
const entorno = process.env as Record<string, string | undefined>;

// Se inicializa al primer uso: así importar este módulo (por ejemplo, en los tests) no toca Firebase.
function auth(): Auth {
  if (instancia) return instancia;
  const app = initializeApp({
    apiKey: entorno.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: entorno.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: entorno.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    appId: entorno.EXPO_PUBLIC_FIREBASE_APP_ID,
  });
  // La sesión se guarda en el teléfono para no pedir el login cada vez que se abre la app.
  instancia = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
  // Los mails de Firebase (recuperar la contraseña) salen en español.
  instancia.languageCode = "es";
  const emulador = entorno.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
  if (emulador) connectAuthEmulator(instancia, emulador, { disableWarnings: true });
  GoogleSignin.configure({ webClientId: entorno.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
  return instancia;
}

export async function iniciarSesionConEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth(), email, password);
}

/**
 * Selector nativo de cuentas de Google y su `idToken` a Firebase. Solo entra con cuentas ya dadas
 * de alta: el registro abierto está deshabilitado en Firebase. Si la persona cierra el selector,
 * rechaza con el código `SIGN_IN_CANCELLED`, que el login no muestra como error.
 */
export async function iniciarSesionConGoogle(): Promise<void> {
  const sesion = auth();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const respuesta = await GoogleSignin.signIn();
  if (respuesta.type === "cancelled")
    throw Object.assign(new Error("Inicio de sesión con Google cancelado."), {
      code: "SIGN_IN_CANCELLED",
    });
  const { idToken } = respuesta.data;
  if (!idToken) throw new Error("Google no devolvió el idToken de la cuenta.");
  await signInWithCredential(sesion, GoogleAuthProvider.credential(idToken));
}

export async function enviarMailRecuperacion(email: string): Promise<void> {
  await sendPasswordResetEmail(auth(), email);
}

export async function cerrarSesion(): Promise<void> {
  await signOut(auth());
  // También se olvida la cuenta de Google, para poder elegir otra en el próximo inicio de sesión.
  await GoogleSignin.signOut();
}

/** ID token de la sesión para el cliente HTTP; espera a que Firebase restaure la sesión guardada. */
export async function obtenerTokenId(): Promise<string | null> {
  const sesion = auth();
  await sesion.authStateReady();
  return (await sesion.currentUser?.getIdToken()) ?? null;
}
