import {
  cerrarSesion,
  enviarMailRecuperacion,
  iniciarSesionConEmail,
  iniciarSesionConGoogle,
  obtenerTokenId,
} from "../src/lib/firebase";

// Ni `firebase` ni `@react-native-google-signin/google-signin` están instalados todavía en mobile:
// se simulan de forma virtual (DEC-0016: los tests nunca tocan el proyecto real de Firebase).
const mockAuth: {
  currentUser: { getIdToken: jest.Mock } | null;
  authStateReady: jest.Mock;
} = { currentUser: null, authStateReady: jest.fn() };

const mockFirebase = {
  signInWithEmailAndPassword: jest.fn(),
  signInWithCredential: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
  credential: jest.fn(),
};
const mockGoogle = { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn() };

jest.mock(
  "firebase/app",
  () => ({ initializeApp: jest.fn(() => ({})), getApps: () => [], getApp: jest.fn() }),
  { virtual: true },
);
jest.mock(
  "firebase/auth",
  () => ({
    getAuth: () => mockAuth,
    initializeAuth: () => mockAuth,
    getReactNativePersistence: jest.fn(),
    connectAuthEmulator: jest.fn(),
    signInWithEmailAndPassword: (...a: unknown[]) => mockFirebase.signInWithEmailAndPassword(...a),
    signInWithCredential: (...a: unknown[]) => mockFirebase.signInWithCredential(...a),
    sendPasswordResetEmail: (...a: unknown[]) => mockFirebase.sendPasswordResetEmail(...a),
    signOut: (...a: unknown[]) => mockFirebase.signOut(...a),
    GoogleAuthProvider: { credential: (...a: unknown[]) => mockFirebase.credential(...a) },
  }),
  { virtual: true },
);
jest.mock(
  "@react-native-google-signin/google-signin",
  () => ({
    GoogleSignin: {
      configure: (...a: unknown[]) => mockGoogle.configure(...a),
      hasPlayServices: (...a: unknown[]) => mockGoogle.hasPlayServices(...a),
      signIn: (...a: unknown[]) => mockGoogle.signIn(...a),
      signOut: jest.fn(),
    },
  }),
  { virtual: true },
);

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.currentUser = null;
  mockAuth.authStateReady.mockResolvedValue(undefined);
  mockFirebase.signInWithEmailAndPassword.mockResolvedValue({});
  mockFirebase.signInWithCredential.mockResolvedValue({});
  mockFirebase.sendPasswordResetEmail.mockResolvedValue(undefined);
  mockFirebase.signOut.mockResolvedValue(undefined);
  mockFirebase.credential.mockImplementation((idToken: string) => ({ idToken }));
  mockGoogle.hasPlayServices.mockResolvedValue(true);
});

describe("RF-140 lib/firebase mobile", () => {
  it("iniciarSesionConEmail autentica en Firebase con el email y la contraseña", async () => {
    await iniciarSesionConEmail("ana@rumbo.test", "secreta123");
    expect(mockFirebase.signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "ana@rumbo.test",
      "secreta123",
    );
  });

  it("iniciarSesionConGoogle pasa el idToken de Google a Firebase con signInWithCredential", async () => {
    mockGoogle.signIn.mockResolvedValue({ type: "success", data: { idToken: "id-token-google" } });
    await iniciarSesionConGoogle();
    expect(mockFirebase.credential).toHaveBeenCalledWith("id-token-google");
    expect(mockFirebase.signInWithCredential).toHaveBeenCalledWith(expect.anything(), {
      idToken: "id-token-google",
    });
  });

  it("iniciarSesionConGoogle: si la persona cancela el selector no llama a Firebase y rechaza con SIGN_IN_CANCELLED", async () => {
    mockGoogle.signIn.mockResolvedValue({ type: "cancelled", data: null });
    await expect(iniciarSesionConGoogle()).rejects.toMatchObject({ code: "SIGN_IN_CANCELLED" });
    expect(mockFirebase.signInWithCredential).not.toHaveBeenCalled();
  });

  it("iniciarSesionConGoogle: sin idToken rechaza y no llama a Firebase", async () => {
    mockGoogle.signIn.mockResolvedValue({ type: "success", data: { idToken: null } });
    await expect(iniciarSesionConGoogle()).rejects.toBeDefined();
    expect(mockFirebase.signInWithCredential).not.toHaveBeenCalled();
  });

  it("obtenerTokenId devuelve el ID token de la sesión una vez restaurada", async () => {
    mockAuth.currentUser = { getIdToken: jest.fn().mockResolvedValue("tok-123") };
    await expect(obtenerTokenId()).resolves.toBe("tok-123");
    expect(mockAuth.authStateReady).toHaveBeenCalled();
  });

  it("obtenerTokenId devuelve null si no hay sesión", async () => {
    await expect(obtenerTokenId()).resolves.toBeNull();
  });
});

describe("RF-142 lib/firebase mobile: recuperación de contraseña", () => {
  it("enviarMailRecuperacion pide el mail a Firebase", async () => {
    await enviarMailRecuperacion("ana@rumbo.test");
    expect(mockFirebase.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      "ana@rumbo.test",
    );
  });
});

describe("RF-143 lib/firebase mobile: cierre de sesión", () => {
  it("cerrarSesion hace signOut en Firebase", async () => {
    await cerrarSesion();
    expect(mockFirebase.signOut).toHaveBeenCalledTimes(1);
  });
});
