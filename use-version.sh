#!/bin/sh
export HULY_VERSION=$1
echo "Setting Huly Version: $HULY_VERSION"
envsubst < template.compose.yaml > compose.yaml
