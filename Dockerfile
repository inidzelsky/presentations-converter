FROM node:18
WORKDIR /app
COPY . /app
RUN apt install imagemagick
RUN npm install & npm run build
CMD ["node", "dist/index.js"]
