# Instructions to deploy Huly on a `self-hosted` server with SSL using `Traefik`

### Prerequisites

- A domain name pointing to the server
- A server with Docker and Docker Compose installed

### Steps

1. Clone the repository

   ```bash
   git clone https://github.com/hcengineering/huly-selfhost.git
   cd huly-selfhost/traefik
   ```

2. Run setup.sh

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. Follow the instructions in the setup script to configure your domain name and email address

   ```bash
   $ ./setup.sh
   Enter the domain name: example.com
   Enter the email address: admin@example.com
   Setup is complete. Run 'docker compose up -d' to start the services.
   ```

4. Modify the `docker-compose.yaml` file to customize any settings

5. Start the services

   ```bash
   docker compose up -d
   ```

6. Access Huly at `https://example.com`
