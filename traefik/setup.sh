#!/bin/bash

# Ask for the domain name
read -p "Enter the domain name: " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
  echo "DOMAIN_NAME is required"
  exit 1
fi

# Ask for the email address
read -p "Enter the email address: " LETSENCRYPT_EMAIL
if [ -z "$LETSENCRYPT_EMAIL" ]; then
  echo "LETSENCRYPT_EMAIL address is required"
  exit 1
fi

export HULY_VERSION="v0.6.501"
export HULY_SECRET="secret"
export SERVER_ADDRESS=$DOMAIN_NAME
export LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL

# replace the domain name and email address in the docker-compose file
envsubst < template-compose.yaml > docker-compose.yaml

echo -e "\033[1;32mSetup is complete. Run 'docker compose up -d' to start the services.\033[0m"
