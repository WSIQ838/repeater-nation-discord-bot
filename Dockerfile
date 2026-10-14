# Keeps the Repeater Nation Discord bot online. Set DISCORD_BOT_TOKEN in the
# host's environment variables (never bake it into the image).
FROM node:22-alpine
WORKDIR /app
COPY presence.mjs .
USER node
CMD ["node", "presence.mjs"]
