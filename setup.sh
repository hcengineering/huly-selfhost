#!/usr/bin/env bash

HULY_VERSION="v0.6.501"
DOCKER_NAME="huly"
CONFIG_FILE="huly.conf"

if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

while true; do
    if [[ -n "$HOST_ADDRESS" ]]; then
        prompt_type="current"
        prompt_value="${HOST_ADDRESS}"
    else
        prompt_type="default"
        prompt_value="localhost"
    fi
    read -p "Enter the host address (domain name or IP) [${prompt_type}: ${prompt_value}]: " input
    _HOST_ADDRESS="${input:-${HOST_ADDRESS:-localhost}}"
    break
done

while true; do
    if [[ -n "$HTTP_PORT" ]]; then
        prompt_type="current"
        prompt_value="${HTTP_PORT}"
    else
        prompt_type="default"
        prompt_value="80"
    fi
    read -p "Enter the port for HTTP [${prompt_type}: ${prompt_value}]: " input
    _HTTP_PORT="${input:-${HTTP_PORT:-80}}"
    if [[ "$_HTTP_PORT" =~ ^[0-9]+$ && "$_HTTP_PORT" -ge 1 && "$_HTTP_PORT" -le 65535 ]]; then
        break
    else
        echo "Invalid port. Please enter a number between 1 and 65535."
    fi
done

echo "$_HOST_ADDRESS $HOST_ADDRESS $_HTTP_PORT $HTTP_PORT"

if [[ "$_HOST_ADDRESS" == "localhost" || "$_HOST_ADDRESS" == "127.0.0.1" || "$_HOST_ADDRESS" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}:?$ ]]; then
    _HOST_ADDRESS="${_HOST_ADDRESS%:}:${_HTTP_PORT}"
    SECURE=""
else
    while true; do
        if [[ -n "$SECURE" ]]; then
            prompt_type="current"
            prompt_value="Yes"
        else
            prompt_type="default"
            prompt_value="No"
        fi
        read -p "Will you serve Huly over SSL? (y/n) [${prompt_type}: ${prompt_value}]: " input
        case "${input}" in
            [Yy]* )
                _SECURE="true"; break;;
            [Nn]* )
                _SECURE=""; break;;
            "" )
                _SECURE="${SECURE:+true}"; break;;
            * )
                echo "Invalid input. Please enter Y or N.";;
        esac
    done
fi

SECRET=false
if [ "$1" == "--secret" ]; then
  SECRET=true
fi

if [ ! -f .huly.secret ] || [ "$SECRET" == true ]; then
  openssl rand -hex 32 > .huly.secret
  echo "Secret generated and stored in .huly.secret"
else
  echo -e "\033[33m.huly.secret already exists, not overwriting."
  echo "Run this script with --secret to generate a new secret."
fi

export HOST_ADDRESS=$_HOST_ADDRESS
export SECURE=$_SECURE
export HTTP_PORT=$_HTTP_PORT
export HTTP_BIND=$HTTP_BIND
export TITLE=${TITLE:-Huly}
export DEFAULT_LANGUAGE=${DEFAULT_LANGUAGE:-en}
export LAST_NAME_FIRST=${LAST_NAME_FIRST:-true}
export HULY_SECRET=$(cat .huly.secret)

envsubst < .template.huly.conf > $CONFIG_FILE

echo -e "\n\033[1;34mConfiguration Summary:\033[0m"
echo -e "Host Address: \033[1;32m$_HOST_ADDRESS\033[0m"
echo -e "HTTP Port: \033[1;32m$_HTTP_PORT\033[0m"
if [[ -n "$SECURE" ]]; then
    echo -e "SSL Enabled: \033[1;32mYes\033[0m"
else
    echo -e "SSL Enabled: \033[1;31mNo\033[0m"
fi

read -p "Do you want to run 'docker compose up -d' now to start Huly? (Y/n): " RUN_DOCKER
case "${RUN_DOCKER:-Y}" in
    [Yy]* )
         echo -e "\033[1;32mRunning 'docker compose up -d' now...\033[0m"
         docker compose up -d
         ;;
    [Nn]* )
        echo "You can run 'docker compose up -d' later to start Huly."
        ;;
esac

echo -e "\033[1;32mSetup is complete!\n Generating nginx.conf...\033[0m"
./nginx.sh
