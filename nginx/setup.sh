#!/usr/bin/env bash

read -p "Enter the domain name: " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
  echo "DOMAIN_NAME is required"
  exit 1
fi

read -p "Enter the port you want nginx to expose: " NGINX_SERVICE_PORT
if [ -z "$NGINX_SERVICE_PORT" ]; then
  echo "NGINX_SERVICE_PORT address is required"
  exit 1
fi

read -p "Do you run behind SSL proxy (did you setup HTTPS)? (Y/n): " NGINX_BEHIND_SSL
case "$NGINX_BEHIND_SSL" in
    [Yy]* )
        NGINX_WS_SCHEME="wss"
        NGINX_HTTP_SCHEME="https"
        ;;
    [Nn]* )
        NGINX_WS_SCHEME="ws"
        NGINX_HTTP_SCHEME="http"
        ;;
    * )
        echo "SSL selected"
        NGINX_WS_SCHEME="wss"
        NGINX_HTTP_SCHEME="https"
        ;;
esac


export HULY_VERSION="v0.6.295"
export NGINX_SERVICE_PORT=$NGINX_SERVICE_PORT
export NGINX_HTTP_SCHEME=$NGINX_HTTP_SCHEME
export NGINX_WS_SCHEME=$NGINX_WS_SCHEME
export SERVER_ADDRESS="${DOMAIN_NAME}:${NGINX_SERVICE_PORT}"

# $(openssl rand -hex 32)
export HULY_SECRET="secret"

# replace the domain name and email address in the docker-compose file
envsubst < template-compose.yaml > docker-compose.yaml

echo -e "\033[1;32mSetup is complete!\033[0m"

read -p "Do you want to run 'docker compose up -d' now to spin up Huly? ([Y]es/[n]o): " RUN_DOCKER
case "${RUN_DOCKER,,}" in  
    y|yes|"" )  
         echo -e "\033[1;32mRunning 'docker compose up -d' now...\033[0m"
        docker compose up -d
        ;;
    n|no )
        echo "You can run 'docker compose up -d' later to start the services."
        ;;
    * )
        echo "Invalid input. You can run 'docker compose up -d' later to start the services."
        ;;
esac