# Single stage, on purpose. See DEPLOYMENT.md "Four constraints that decide the
# host": `npm run seed`, `npm run assemble`, and `npm run grant-pro` all execute
# through `tsx`, which is a devDependency. An image built with `--omit=dev`, or
# one that prunes after building, cannot seed the database or grant anyone Pro.
FROM node:20-slim

# better-sqlite3 is a native addon and may compile from source when no prebuilt
# binary matches the platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Load-bearing: the database path resolves against process.cwd(). Starting the
# process anywhere else makes SQLite silently create a new empty database there
# while the real one sits untouched on the volume.
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# APP_URL is consumed by `next build` and frozen into the prerendered HTML,
# sitemap.xml, robots.txt, and metadataBase. Supplying it only at runtime leaves
# a live site advertising localhost, so it has to be a build argument:
#   fly deploy --build-arg APP_URL='https://your-domain'
ARG APP_URL
ENV APP_URL=${APP_URL}

# Seed a build-local database before building. The marketing homepage is
# statically prerendered and reads the question bank during `next build`; with
# no seeded database the counts render as zero and the samples vanish.
#
# This database is thrown away when the volume mounts over data/ at runtime, so
# this is safe on every rebuild — it never touches production data.
RUN npm run seed && npm run assemble

RUN npm run build

# The volume mounts over data/ and hides everything the image put there,
# including data/generated/*.json. Stash the question bank outside data/ so the
# first-provision seed can copy it back onto the volume.
RUN mkdir -p /app/seed-data \
 && cp data/generated/questions.json data/generated/topics.json /app/seed-data/

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
