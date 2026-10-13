---
tipo: decision
estado: formalizado
modulo: [seguridad]
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 13/10/26
supersede: DEC-0008 §1, DEC-0015 §2 y §3
actualizado: 13/10/26
---
# DEC-0016 Autenticación con Firebase

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Aprobada por el equipo completo el 13/10/26** (Francisco, Nahuel y Paloma, reunidos), a pedido del propio equipo, durante la revisión de la [[Spec de implementación]].
>
> **Reemplaza** el §1 de [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]] (autenticación propia con usuario y contraseña) y los §2 (sesión con JWT propio) y §3 (contraseña temporal con cambio obligado) de [[DEC-0015 Decisiones de implementación|DEC-0015]]. El resto de esas decisiones sigue vigente: roles, rol `freelance`, visibilidad y auditoría.

## Contexto
DEC-0008 fijó un login propio (usuario y contraseña individual) y DEC-0015 lo bajó a implementación: JWT de 12 h, hash Argon2id, contraseñas temporales y un campo `debe_cambiar_password`. Antes de planificar los tickets, el equipo propuso delegar la autenticación en **Firebase Authentication**. Así el backend nunca maneja contraseñas, se obtiene gratis el mail de «elegí o restablecé tu contraseña» (no había servicio de correo en el alcance) y el inicio con Google de [[CU-24 Iniciar sesión|CU-24]] A2, que estaba previsto como futuro, queda a mano.

## Decisión
1. **Firebase solo autentica; la autorización sigue en Rumbo.**
   - La web y el mobile inician sesión con el SDK de Firebase (**email y contraseña**, o **Google**) y mandan el *ID token* en `Authorization: Bearer`.
   - La API lo verifica con `firebase-admin` y carga al [[Usuario]] por **`firebase_uid`**. Si no existe en Rumbo o está **inactivo**, responde `401`. Una baja de [[CU-25 Gestionar usuarios y roles|CU-25]] corta el acceso en el pedido siguiente.
   - Rol, `acceso_redes`, la visibilidad por fila, los permisos y la auditoría siguen como en [[DEC-0005 Autenticación y modelo de roles|DEC-0005]] y DEC-0008 §2 a §4. No se usan *custom claims* de Firebase.
2. **Nadie se registra solo.** El registro abierto está deshabilitado en Firebase.
   - En CU-25, el `admin` o la dueña da de alta al usuario en Rumbo, y el backend crea su cuenta en Firebase con el Admin SDK (mismo email y sin contraseña).
   - **Firebase le manda el mail** con el link para elegir su contraseña.
   - El login ofrece «olvidé mi contraseña» con el mismo mail.
   - Rumbo nunca ve, asigna ni guarda contraseñas: RNF-03 lo cumple Firebase.
3. **Inicio con Google** (CU-24 A2) en la web y el mobile, **solo para cuentas ya dadas de alta**. Firebase vincula el proveedor de Google a la cuenta con el mismo email (una cuenta por email), así que el `firebase_uid` es el mismo. Un email que no está en Rumbo recibe `401`.
4. **Sesión:** la maneja el SDK de Firebase (ID token de 1 h, renovado solo). El logout es `signOut()` del SDK. `GET /auth/yo` devuelve el usuario de Rumbo con su rol y accesos.
5. **Modelo de datos:** en `Usuario`, `password_hash` y `debe_cambiar_password` se reemplazan por **`firebase_uid`** (único, obligatorio). Ya está propagado a [[Usuario]], [[DGM-ER]] y `rumbo.sql`.
6. **Contrato:** salen `POST /auth/login`, `POST /auth/logout`, `POST /auth/cambiar-password` y `POST /usuarios/{id}/restablecer-password`. Queda `GET /auth/yo`. El contrato de referencia del PC2 lo genera FastAPI ([[DEC-0015 Decisiones de implementación|DEC-0015]] §6); el `openapi.json` del PC1 queda como foto del diseño.
7. **Mobile:** el login con Google exige un *development build* de Expo (no Expo Go), que se adopta desde el módulo de fundaciones.
8. **Pruebas:** el backend inyecta un **verificador falso** de tokens. Los e2e y el desarrollo local usan el **Firebase Auth Emulator** (`firebase-tools`, necesita Java). Ningún test usa el proyecto real.
9. **Configuración y secretos:** el proyecto de Firebase lo crea el equipo, y es un **ticket del módulo de fundaciones**. La config de la web y el mobile es pública. La **cuenta de servicio** del backend es secreta: va en el `.env` (local y del servidor), nunca en Git.

## Riesgos aceptados
- **Sin internet no se puede iniciar sesión.** Quien ya tenga sesión sigue trabajando mientras el SDK pueda renovar su token. La entrada local directa de [[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]] pierde casi todo su valor como respaldo.
- **Los datos de las cuentas del personal** (email, nombre y proveedor) quedan en Google. Los datos de pasajeros y la información comercial **no** salen del sistema: RNF-16 no cambia.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Autenticación propia (DEC-0015) | Funciona sin internet; sin servicios externos | Contraseñas, hash, JWT y pantallas de cambio a cargo nuestro; sin mail de recuperación | ❌ |
| Firebase + login local de emergencia | Recupera el respaldo sin internet | Dos mecanismos de autenticación que mantener | ❌ |
| **Firebase Authentication** | Sin manejar contraseñas; mail de recuperación y Google incluidos | Depende de internet y de Google | ✅ |
| Firebase con contraseña temporal del admin | Sirve sin email propio | Conserva `debe_cambiar_password` y las pantallas | ❌ |
| Roles en *custom claims* de Firebase | El token ya trae el rol | Dos fuentes del rol; una baja no corta al instante | ❌ |

## Impacto
- **Modelo:** [[Usuario]], [[DGM-ER]] y `05-Diseño/Datos/rumbo.sql` (`firebase_uid`).
- **Casos de uso:** [[CU-24 Iniciar sesión|CU-24]] (flujo con Firebase, A2 habilitado, A4 «olvidé mi contraseña») y [[CU-25 Gestionar usuarios y roles|CU-25]] (el alta crea la cuenta y dispara el mail).
- **Arquitectura:** [[ARQ — Vista general]]. `core.seguridad` verifica tokens de Firebase, y Firebase aparece como sistema externo en el C4 y en el despliegue.
- **Proceso:** [[Spec de implementación]] y [[Skills compartidas]] (`firebase-tools` y Java).
- Fuera de alcance: el registro abierto y otros proveedores (Facebook, Apple…).

## Decisores y fecha
- Propuesta del equipo; bajada técnica de Nahuel con Claude Code. Decisores: Francisco, Nahuel y Paloma. **Aprobada: 13/10/26.**

## Vínculo con el código (a partir de PC2)
- Rama: `-` · Commits: `-`
