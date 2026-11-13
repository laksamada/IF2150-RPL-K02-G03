# Image server API SILEMBUR untuk deploy (mis. Railway). Build dari folder src/:
#   docker build -t silembur-api .
# Hanya memasang dependensi server + @silembur/shared (tanpa dependensi Expo/mobile).
# Rahasia (DATABASE_URL, JWT_SECRET, ...) TIDAK dimasukkan ke image: diisi lewat environment variable saat deploy.
FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared ./shared
COPY server/package.json ./server/package.json
COPY mobile/package.json ./mobile/package.json
RUN npm ci --workspace server --omit=dev && npm cache clean --force

COPY server ./server

# Folder foto default; di Railway arahkan UPLOAD_DIR ke volume (mis. /data/uploads) agar foto tidak hilang.
ENV UPLOAD_DIR=/app/server/uploads

# Migrasi idempoten (hanya menjalankan file yang belum pernah dijalankan), lalu start server.
CMD ["sh", "-c", "npm run db:migrate && npm run start -w server"]
