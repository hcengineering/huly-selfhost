#!/usr/bin/env bash

export SERVER_ADDRESS="$1"
export HULY_SECRET="secret"

echo "Setting Huly Server Address: $SERVER_ADDRESS"
envsubst < template.conf > nginx.conf
envsubst < template.env > .env

./use-version.sh v0.6.333
