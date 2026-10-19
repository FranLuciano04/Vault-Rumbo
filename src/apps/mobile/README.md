# @rumbo/mobile

App mobile de Rumbo: Expo (SDK 58) con **development build** (no Expo Go, por el login con Google; DEC-0016), Expo Router, NativeWind v4 y TypeScript estricto.

## Versiones (exactas, alineadas con `expo/bundledNativeModules.json` del SDK 58)

- `expo` 58.0.16 · `react-native` 0.88.0 · `react` **19.3.0** (exacta: React Native la exige y la web usa `^19.3.1`; pnpm instala las dos sin chocar).
- `nativewind` 4.2.7 con `tailwindcss` **3.4.19** (NativeWind 4 requiere Tailwind 3; la web usa Tailwind 4, son paquetes independientes) y `react-native-css-interop` 0.2.7 declarada directa (pnpm no resuelve la transitiva).
- Tests: `jest` 30 + `jest-expo` + `@testing-library/react-native` 14.

## Comandos (desde `src/`)

```bash
pnpm install
pnpm --filter @rumbo/mobile start        # dev server para development build (expo start --dev-client)
pnpm --filter @rumbo/mobile android      # compila e instala el development build y lo abre
pnpm --filter @rumbo/mobile test
pnpm --filter @rumbo/mobile test:cobertura
pnpm --filter @rumbo/mobile typecheck
pnpm --filter @rumbo/mobile lint
```

## Generar e instalar el development build

El development build es una app nativa propia (con `expo-dev-client`) que se conecta al dev server de Metro. Se compila una vez y solo se vuelve a compilar si cambian dependencias nativas o `app.json`; el código JS se recarga solo.

### Opción A: build local en un emulador Android (Windows)

Requisitos: Android Studio (trae el JDK 17+ y el SDK), un emulador creado en el Device Manager y NDK/CMake instalados desde el SDK Manager.

1. Definí las variables de entorno (una vez):
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`
2. Abrí el emulador desde Android Studio (o `emulator -avd <nombre>`).
3. Desde `src/`:

   ```bash
   pnpm --filter @rumbo/mobile android
   ```

   La primera vez genera `android/` (`expo prebuild`, está en `.gitignore`), compila con Gradle (varios minutos) e instala la app **Rumbo** en el emulador.

4. En otra terminal: `pnpm --filter @rumbo/mobile start` y abrí la app Rumbo en el emulador; se conecta sola al dev server.

### Opción B: teléfono Android físico

1. Activá «Opciones de desarrollador» y «Depuración USB», conectá el teléfono por USB y verificá con `adb devices`.
2. Corré `pnpm --filter @rumbo/mobile android`: instala el build en el teléfono.
3. Con el teléfono en la misma red Wi-Fi que la PC, ejecutá `pnpm --filter @rumbo/mobile start` y abrí la app; si no encuentra el servidor, escaneá el QR o escribí la URL que muestra la terminal.

### Opción C: build en la nube con EAS (requiere cuenta de Expo)

```bash
npx eas-cli login
npx eas-cli build --profile development --platform android   # genera un APK instalable
```

Hace falta un `eas.json` con un perfil `development` (`"developmentClient": true`, `"distribution": "internal"`); se agrega cuando el equipo decida usar EAS. iOS necesita Mac y cuenta de Apple Developer: queda fuera del alcance por ahora.

## Estructura y convenciones

- `app/`: rutas de Expo Router. **No poner tests ni helpers dentro de `app/`**: Expo Router los empaqueta como rutas. Los tests de pantallas viven en `__tests__/`.
- `src/` (se crea con el primer feature): `features/<modulo>/` y `components/`, como en la Spec de implementación §5.
- Estilos con clases de NativeWind (`className`); `global.css` se importa una sola vez en `app/_layout.tsx`.
- `babel.config.js`, `metro.config.js` y `tailwind.config.js` son CommonJS porque Expo/Metro los cargan así.
