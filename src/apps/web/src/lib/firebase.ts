import { initializeApp } from "firebase/app";
import {
  type Auth,
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

/**
 * Único punto de contacto con el SDK de Firebase Authentication (DEC-0016): Firebase autentica y
 * la autorización queda en la API. La config sale de las `VITE_FIREBASE_*` (ver `.env.example`).
 */
let instancia: Auth | undefined;

// Se inicializa al primer uso: así importar este módulo (por ejemplo, en los tests) no toca Firebase.
function auth(): Auth {
  if (instancia) return instancia;
  const entorno = import.meta.env;
  const app = initializeApp({
    apiKey: entorno.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: entorno.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: entorno.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: entorno.VITE_FIREBASE_APP_ID as string | undefined,
  });
  instancia = getAuth(app);
  // Los mails de Firebase (recuperar la contraseña) salen en español.
  instancia.languageCode = "es";
  const emulador = entorno.VITE_FIREBASE_AUTH_EMULATOR_URL as string | undefined;
  if (emulador) connectAuthEmulator(instancia, emulador, { disableWarnings: true });
  return instancia;
}

export async function iniciarSesionConEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth(), email, password);
}

/** Solo entra con cuentas ya dadas de alta: el registro abierto está deshabilitado en Firebase. */
export async function iniciarSesionConGoogle(): Promise<void> {
  await signInWithPopup(auth(), new GoogleAuthProvider());
}

export async function enviarMailRecuperacion(email: string): Promise<void> {
  await sendPasswordResetEmail(auth(), email);
}

export async function cerrarSesion(): Promise<void> {
  await signOut(auth());
}

/** ID token de la sesión para el cliente HTTP; espera a que Firebase restaure la sesión guardada. */
export async function obtenerTokenId(): Promise<string | null> {
  const sesion = auth();
  await sesion.authStateReady();
  return (await sesion.currentUser?.getIdToken()) ?? null;
}
