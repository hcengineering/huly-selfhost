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

sed -i "s|server_name .*;|server_name ${HOST_ADDRESS};|" ./nginx.conf
sed -i "s|proxy_pass .*;|proxy_pass http://${HTTP_BIND:-127.0.0.1}:${HTTP_PORT};|" ./nginx.conf

# Update listen directive to either port 80 or 443, while preserving IP address
if [[ -n "$SECURE" ]]; then
    # Secure (use port 443 and add 'ssl')
    sed -i -E "s|(listen )(.*:)?([0-9]+)?;|\1\2443 ssl;|" ./nginx.conf
    echo "Serving over SSL. Make sure to add your SSL certificates."
else
    # Non-secure (use port 80 and remove 'ssl')
    sed -i -E "s|(listen )(.*:)?[0-9]+ ssl;|\1\280;|" ./nginx.conf
    sed -i -E "s|(listen )(.*:)?[0-9]+;|\1\280;|" ./nginx.conf
fi
