FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY libraries ./libraries
COPY services ./services
RUN pnpm install --frozen-lockfile --filter @naija-bi/auth-api...
RUN pnpm --filter @naija-bi/auth-api... run build
RUN pnpm --filter @naija-bi/auth-api deploy --prod --legacy /prod

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod ./
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3002/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".dist/entry-points/api/server.js"]
