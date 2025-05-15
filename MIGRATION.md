# Huly Migration

This document describes the changes required to update Huly from one version to another. Most of updates require updating Docker containers versions.
Though, some updates may require updating other configuration options. In this case, you should review the updated configuration options and update them accordingly.

## v0.6.501

No changes required.

## v0.6.499

No changes required.

## v0.6.496

No changes required.

## v0.6.482

No changes required.

## v0.6.471

### Overview

The new Mail Service, supporting both SMTP and Amazon SES, has been added. If your setup currently uses the `ses` service, you'll need to migrate to the `mail` service.

### Key Changes

- **Unified Mail Service**: The `mail` service can be configured to send emails via SMTP or Amazon SES, but not both simultaneously.
- **Migration Requirement**: Transitioning from the `ses` service to the `mail` service requires updating your `docker-compose.yaml` file.

### Migration Steps

1. **Update Configuration**: Replace the `ses` service with the `mail` service in your `docker-compose.yaml` file. Configure the environment variables to match your chosen email service (SMTP or SES).

2. **Rename Environment Variables**: If you're using SES, update your environment variables:
   - Change `ACCESS_KEY` to `SES_ACCESS_KEY`
   - Change `SECRET_KEY` to `SES_SECRET_KEY`
   - Change `REGION` to `SES_REGION`

3. **Integrate the Mail Service**: Use `MAIL_URL` instead of `SES_URL` in `transactor` and `account` containers:

    ```yaml
    account:
      ...
      environment:
        - MAIL_URL=http://mail:8097
      ...
    transactor:
      ...
      environment:
        - MAIL_URL=http://mail:8097
      ...
    ```
4. **Web Push Notifications**: Add `WEB_PUSH_URL` to `transactor` container if you want to use web push notifications:
    ```yaml
    transactor:
      ...
      environment:
        - MAIL_URL=http://mail:8097
        - WEB_PUSH_URL=http://ses:3335
      ...
    ```


## v0.6.466

No changes required.

## v0.6.429

No changes required.

## v0.6.424

Web-push keys have been moved from the `front` service to the `ses` service. If you are using the `ses` service, you will need to update the configuration:

```yaml
  front:
    ...
    environment:
      ...
      # Remove the following lines
      # - PUSH_PUBLIC_KEY=your public key
      # - PUSH_PRIVATE_KEY=your private key
  ses:
    ...
    environment:
      ...
      # Add the following lines
      - PUSH_PUBLIC_KEY=your public key
      - PUSH_PRIVATE_KEY=your private key
```

## v0.6.411

No changes required.

## v0.6.405

No changes required.

## v0.6.377

### Fulltext Service

Fulltext search functionality has been extracted into a separate `fulltext` service. This service is now required to be running in order to use the fulltext search functionality.

Configuration:

```yaml
  fulltext:
    image: hardcoreeng/fulltext:${HULY_VERSION}
    ports:
      - 4700:4700
    environment:
      - SERVER_SECRET=${HULY_SECRET}
      - DB_URL=mongodb://mongodb:27017
      - FULLTEXT_DB_URL=http://elastic:9200
      - ELASTIC_INDEX_NAME=huly_storage_index
      - STORAGE_CONFIG=minio|minio?accessKey=minioadmin&secretKey=minioadmin
      - REKONI_URL=http://rekoni:4004
      - ACCOUNTS_URL=http://account:3000
      - STATS_URL=http://stats:4900
    restart: unless-stopped
```

Update the `transactor` service to use the new `fulltext` service:

```yaml
  transactor:
    ...
    environment:
      ...
      - FULLTEXT_URL=http://fulltext:4700
      # Remove the following lines
      # - ELASTIC_URL=http://elastic:9200
      # - ELASTIC_INDEX_NAME=huly_storage_index
      # - REKONI_URL=http://rekoni:4004
```

### Statistics Service

New statistics service has been added. The serivce is responsible for collecting and storing statistics about the usage of the application.

Configuration:

```yaml
  stats:
    image: hardcoreeng/stats:${HULY_VERSION}
    ports:
      - 4900:4900
    environment:
      - PORT=4900
      - SERVER_SECRET=${HULY_SECRET}
    restart: unless-stopped
```

Other Huly services have been updated to use the new statistics service:

```yaml
  ...
    environment:
      - STATS_URL=http://stats:4900
      ...
```
