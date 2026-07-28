# Build Stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# This builds the app respecting the base: '/transport/' in vite.config.js
RUN npm run build

# Production Serving Stage
FROM nginx:alpine
# Copy custom nginx configuration to support React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built assets into the nginx html directory under the 'transport' subfolder
COPY --from=build /app/dist /usr/share/nginx/html/transport
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
