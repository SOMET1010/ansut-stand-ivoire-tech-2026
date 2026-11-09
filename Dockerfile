# syntax=docker/dockerfile:1
# Plateforme du stand ANSUT – Ivoire Tech Forum 2026
# Deux cibles :
#   --target app      → image de l'application (Azure App Service / Web App for Containers)
#   --target migrator → tâche ponctuelle : migrations Prisma + données initiales (avant le déploiement)
# La compilation ne touche JAMAIS la base : migrations et seeds sont des étapes séparées.

# Image de base paramétrable (miroir possible si Docker Hub limite les téléchargements anonymes)
ARG NODE_IMAGE=node:20-bookworm-slim
FROM ${NODE_IMAGE} AS base
# openssl : utile au diagnostic Prisma (libssl3 est déjà présente dans l'image slim).
# INSTALL_OS_PACKAGES=0 pour un build derrière un proxy qui n'autorise que HTTPS.
ARG INSTALL_OS_PACKAGES=1
RUN if [ "$INSTALL_OS_PACKAGES" = "1" ]; then apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*; fi
WORKDIR /app

# ── Dépendances (versions figées par package-lock.json) ─────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
# extra_ca : certificat facultatif, seulement pour un build derrière un proxy d'entreprise (inutile sur Azure)
RUN --mount=type=secret,id=extra_ca,required=false sh -c 'if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm_config_cafile=/run/secrets/extra_ca; fi; npm ci --no-audit --no-fund'

# ── Compilation ─────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
# Valeurs factices : la compilation n'ouvre aucune connexion à la base.
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXTAUTH_SECRET=build-only-not-a-secret \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    DIRECT_URL=postgresql://build:build@localhost:5432/build
RUN --mount=type=secret,id=extra_ca,required=false sh -c 'if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm_config_cafile=/run/secrets/extra_ca; fi; npx prisma generate && npx next build'

# ── Migrations + seeds (exécutée par le pipeline, pas au démarrage) ─────────
FROM deps AS migrator
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY scripts ./scripts
COPY src/config ./src/config
COPY data/itf2026-sessions.json ./data/itf2026-sessions.json
COPY tsconfig.json ./
USER node
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed:prod"]

# ── Image d'exécution (légère, sans sources ni dépendances de dev) ──────────
FROM base AS app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
