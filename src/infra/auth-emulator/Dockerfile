# Auth Emulator de Firebase para los e2e (DEC-0016). Contexto: src. Solo Auth: no necesita Java.
FROM node:22-slim
RUN npm install --global firebase-tools@14 && npm cache clean --force
WORKDIR /emulador
RUN chown node:node /emulador
COPY --chown=node:node infra/auth-emulator/firebase.json .
EXPOSE 9099
# Sin root: la imagen trae el usuario `node` (T-019, Semgrep dockerfile.security.missing-user).
USER node
CMD ["firebase", "emulators:start", "--only", "auth", "--project", "demo-rumbo"]
