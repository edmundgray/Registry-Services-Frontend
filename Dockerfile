FROM nginx:1.27-alpine

# BACKEND_URL: base URL of the Registry API (no trailing slash), e.g. https://registry-api.example.com
ENV PORT=8080 \
    BACKEND_URL=http://host.docker.internal:8080

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY RegistryServices/ /usr/share/nginx/html/

EXPOSE 8080
