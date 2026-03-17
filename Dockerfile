FROM node:22.16-alpine3.22

RUN apk add --no-cache dumb-init && apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

ENV NODE_ENV=production

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY dist/ ./dist/

EXPOSE 8080

USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]
