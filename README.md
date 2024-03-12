# Huly Self Hosted

Please use this Readme if you want to deploy Huly on your server with `docker compose`. I'm using Basic droplet on Digital Ocean with Ubuntu 23.10, but this instructions can be easily tweaked for any Linux distro.

> [!NOTE]  
> Huly is quite resource heavy, so I use 2 vCPU droplet with 4GB of RAM. Droplet with less RAM can stop responding or die.

## Installing `nginx` and `docker`

Let's install `nginx` and `docker` first using commands below, if you do not have them installed on your machine.

```
$ sudo apt update
$ sudo apt install nginx
$ sudo apt install docker.io
```

## Clone `huly-seflhost` repository

Let's clone `huly-seflhost` repository and configure server address, I will use `1.1.1.1` as server address for this example.

```
$ git clone https://github.com/hcengineering/huly-selfhost.git
cd huly-selfhost
./setup.sh 1.1.1.1
```

