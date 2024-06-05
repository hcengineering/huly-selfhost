# Huly Self-Hosted

Please use this README if you want to deploy Huly on your server with `docker compose`. I'm using a Basic Droplet on Digital Ocean with Ubuntu 23.10, but these instructions can be easily adapted for any Linux distribution.

> [!NOTE]
> Huly is quite resource-heavy, so I recommend using a Droplet with 2 vCPUs and 4GB of RAM. Droplets with less RAM may stop responding or fail.

If you prefer Kubernetes deployment, there is a sample Kubernetes configuration under [kube](kube) directory.

## Installing `nginx` and `docker`

First, let's install `nginx` and `docker` using the commands below if you have not already installed them on your machine.

```bash
$ sudo apt update
$ sudo apt install nginx
$ sudo snap install docker
```

## Clone the `huly-selfhost` repository and configure `nginx`

Next, let's clone the `huly-selfhost` repository and configure the server address. _Please replace **x.y.z.w** with your server's IP address_.

```bash
$ git clone https://github.com/hcengineering/huly-selfhost.git
$ cd huly-selfhost
$ ./setup.sh x.y.z.w # Replace x.y.z.w with your server's IP address
$ sudo ln -s $(pwd)/nginx.conf /etc/nginx/sites-enabled/
```

## Now we're ready to run Huly

Finally, let's restart `nginx` and run Huly with `docker compose`.

```bash
$ sudo systemctl restart nginx
$ sudo docker compose up
```

Now, launch your web browser and enjoy Huly!
