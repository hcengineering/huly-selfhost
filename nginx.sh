if [ -f "huly.conf" ]; then
    source "huly.conf"
fi

# Check for --recreate flag
RECREATE=false
if [ "$1" == "--recreate" ]; then
    RECREATE=true
fi

# Handle nginx.conf recreation or updating
if [ "$RECREATE" == true ]; then
    cp .template.nginx.conf nginx.conf
    echo "nginx.conf has been recreated from the template."
else
    if [ ! -f "nginx.conf" ]; then
        echo "nginx.conf not found, creating from template."
        cp .template.nginx.conf nginx.conf
    else
        echo "nginx.conf already exists. Only updating server_name and proxy_pass."
        echo "Run with --recreate to fully overwrite nginx.conf."
    fi
fi

# Update server_name and proxy_pass
sed -i "s|server_name .*;|server_name ${HOST_ADDRESS};|" ./nginx.conf
sed -i "s|proxy_pass .*;|proxy_pass http://${HTTP_BIND:-127.0.0.1}:${HTTP_PORT};|" ./nginx.conf

# Update listen directive to either port 80 or 443, while preserving IP address
if [[ -n "$SECURE" ]]; then
    # Secure (use port 443 and add 'ssl')
    sed -i -E '0,/listen/s|(listen )(.*:)?([0-9]+)?;|\1\2443 ssl;|' ./nginx.conf
    echo "Serving over SSL. Make sure to add your SSL certificates."
else
    # Non-secure (use port 80 and remove 'ssl')
    sed -i -E "s|(listen )(.*:)?[0-9]+ ssl;|\1\280;|" ./nginx.conf
    sed -i -E "s|(listen )(.*:)?([0-9]+)?;|\1\280;|" ./nginx.conf
fi

IP_ADDRESS=$(grep -oP 'listen \K[^:]+(?=:[0-9]+ ssl;)' nginx.conf)
echo $IP_ADDRESS

# Remove HTTP to HTTPS redirect server block if SSL is enabled
if [[ -z "$SECURE" ]]; then
    echo "Enabling SSL; removing HTTP to HTTPS redirect block..."
    # Remove the entire server block for port 80
    if grep -q 'return 301 https://$host$request_uri;' nginx.conf; then
        sed -i '/# !/,/!/d' nginx.conf
    fi
else
    if grep -q 'return 301 https://$host$request_uri;' nginx.conf; then
        sed -i '/# !/,/!/d' nginx.conf
    fi

    # Check if the HTTP to HTTPS redirect block already exists
    echo "Creating HTTP to HTTPS redirect..."
    echo -e "# ! DO NOT REMOVE COMMENT
# DO NOT MODIFY, CHANGES WILL BE OVERWRITTEN
server {
    listen ${IP_ADDRESS:+${IP_ADDRESS}:}80;
    server_name ${HOST_ADDRESS};
    return 301 https://\$host\$request_uri;
}
# DO NOT REMOVE COMMENT !" >> ./nginx.conf
fi