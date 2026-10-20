# Imagen de nginx con la web compilada. Contexto: src (workspace de pnpm). DEC-0011, DEC-0015 §7.
# Las VITE_* son configuración pública del SDK de Firebase (no secretos): se incrustan en el build.
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo

# Dependencias primero: esta capa se reutiliza mientras no cambien los manifiestos.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
# Sin scripts de instalación: el postinstall de msw (solo para tests) lo bloquea pnpm y el build no lo usa.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @rumbo/web...

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web

ARG VITE_API_URL=
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_AUTH_EMULATOR_URL
RUN pnpm --filter @rumbo/web build

FROM nginx:1.29-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
