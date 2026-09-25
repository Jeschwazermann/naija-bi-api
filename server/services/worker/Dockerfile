FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY libraries ./libraries
COPY services ./services
RUN pnpm install --frozen-lockfile --filter @naija-bi/worker...
RUN pnpm --filter @naija-bi/worker... run build
RUN pnpm --filter @naija-bi/worker deploy --prod --legacy /prod

FROM node:22-alpine AS runtime
ENV NODE_ENV=production HEALTH_PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /prod ./
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".dist/entry-points/worker/index.js"]
