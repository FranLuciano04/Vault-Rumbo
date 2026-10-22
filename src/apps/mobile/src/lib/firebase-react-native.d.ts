import type { Persistence } from "firebase/auth";

// En React Native, Metro resuelve `firebase/auth` al bundle `rn` de `@firebase/auth`, que exporta
// `getReactNativePersistence`; los tipos públicos de `firebase/auth` no la declaran.
declare module "firebase/auth" {
  interface AlmacenamientoReactNative {
    getItem(clave: string): Promise<string | null>;
    setItem(clave: string, valor: string): Promise<void>;
    removeItem(clave: string): Promise<void>;
  }
  export function getReactNativePersistence(almacenamiento: AlmacenamientoReactNative): Persistence;
}
