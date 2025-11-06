#!/usr/bin/env bash
set -euo pipefail

if [[ "${__FILE_SOURCED:-}" == "1" ]]; then
  return 0
fi
__FILE_SOURCED=1


cat > Dockerfile <<EOF
FROM node:22 AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

# stage runtime
FROM node:22-alpine as runtime

RUN apk add --no-cache openssl

# create non-root user
RUN adduser -S app && adduser -S -G app app

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

COPY scripts/ ./scripts

RUN mkdir -p /usr/src/app/temp
RUN mkdir -p /usr/src/app/uploads
RUN mkdir -R app:app /usr/src/app/node_modules/@prisma/engines

RUN chmod +x scripts/wait-for-it.sh

RUN npx prisma generate

RUN chmod +x scripts/entrypoint.sh

# use crated non-root user
USER app

ENV NODE_ENV=production

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
