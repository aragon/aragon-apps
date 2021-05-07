# Stage 1 - build
FROM node:12.22 as build-deps
WORKDIR /usr/src/app
RUN apt-get update && apt-get install rsync -y
COPY package.json yarn.lock ./
RUN yarn
COPY . ./
RUN yarn build

# Stage 2 - the production environment
FROM nginx:1.18-alpine
COPY --from=build-deps /usr/src/app/build /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]