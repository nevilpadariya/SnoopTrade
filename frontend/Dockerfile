# Use the official Nginx image as the base image
FROM nginx:alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Remove default Nginx static files
RUN rm -rf ./*

# Copy React build files to the Nginx web root
COPY build/ .

# Copy custom Nginx configuration to override default behavior
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the server
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
