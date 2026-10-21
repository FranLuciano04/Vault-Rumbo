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

## Variables de entorno

`EXPO_PUBLIC_API_URL`: URL base de la API (por defecto `http://localhost:8000`). Copiá `.env.example` a `.env` para cambiarla. En el emulador de Android, `localhost` es el propio emulador: usá `http://10.0.2.2:8000` para llegar a la PC; en un teléfono físico, la IP de la PC en la red.

## Generar e instalar el development build

El development build es una app nativa propia (con `expo-dev-client`) que se conecta al dev server de Metro. Se compila una vez y solo se vuelve a compilar si cambian dependencias nativas o `app.json`; el código JS se recarga solo.

### Opción A: build local en un emulador Android (Windows)

Requisitos: Android Studio (trae el JDK 17+ y el SDK), un emulador creado en el Device Manager y CMake instalado desde el SDK Manager. La NDK **27.1.12297006** (la que fija React Native 0.88, pesa cerca de 1 GB) la descarga Gradle sola la primera vez, siempre que hayas aceptado las licencias (`sdkmanager --licenses`).

1. Definí las variables de entorno (una vez):
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`
   - Sumá al `PATH` `%ANDROID_HOME%\platform-tools` (`adb`) y `%ANDROID_HOME%\emulator`. En PowerShell: `[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\emulator", "User")` y reabrí la terminal.
2. Abrí el emulador desde Android Studio (o `emulator -avd <nombre>`).
3. Desde `src/`:

   ```bash
   pnpm --filter @rumbo/mobile android
   ```

   La primera vez genera `android/` (`expo prebuild`, está en `.gitignore`), compila con Gradle (varios minutos) e instala la app **Rumbo** en el emulador. Además deja Metro corriendo y la app se conecta sola al dev server.

4. En las sesiones siguientes, con el build ya instalado, alcanza con `pnpm --filter @rumbo/mobile start` y abrir la app Rumbo en el emulador.

> Windows, rutas largas: si Gradle, CMake o Git fallan con «Filename longer than 260 characters» o con `ninja: error: manifest 'build.ninja' still dirty after 100 tries`, las rutas de `.cxx` de `react-native-screens` y `react-native-worklets` superan los 260 caracteres (pnpm resuelve a la ruta real, así que una unidad `subst` no sirve). Solución verificada:
>
> 1. Habilitá las rutas largas (PowerShell como administrador, y reiniciá la sesión): `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force`, y corré `git config core.longpaths true`.
> 2. Instalá `cmake;3.31.6` desde el SDK Manager (el CMake 3.22.1 trae un ninja 1.10.2 que no soporta rutas largas).
> 3. Después de cada `expo prebuild` (que regenera `android/`), agregá a `android/local.properties`: `cmake.dir=C\:/Users/<usuario>/AppData/Local/Android/Sdk/cmake/3.31.6`.

### Opción B: teléfono Android físico

1. Activá «Opciones de desarrollador» y «Depuración USB», conectá el teléfono por USB y verificá con `adb devices`.
2. Corré `pnpm --filter @rumbo/mobile android`: compila, instala el build en el teléfono y deja Metro corriendo.
3. En las sesiones siguientes, con el teléfono en la misma red Wi-Fi que la PC, ejecutá `pnpm --filter @rumbo/mobile start` y abrí la app; si no encuentra el servidor, escaneá el QR o escribí la URL que muestra la terminal.

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
