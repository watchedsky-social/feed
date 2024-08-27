FROM cgr.dev/chainguard/node:latest-dev AS base

WORKDIR /app
COPY package.json /app

USER root
RUN corepack enable

FROM base AS build

WORKDIR /app
COPY . /app/
COPY .yarnrc.yml /app

RUN yarn install --immutable
RUN yarn build

FROM base AS release

WORKDIR /app

COPY --from=build /app/package.json /app/yarn.lock /app/.yarn /app/.yarnrc.yml /app/
COPY --from=build /app/dist /app/
RUN yarn workspaces focus --production

RUN chown -R 65532:65532 /app

USER 65532

CMD [ "/app/index.js" ]
