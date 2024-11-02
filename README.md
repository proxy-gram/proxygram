# Proxygram

Inspired by [Jeff's multiplexing explanation](https://dev.to/progrium/the-history-and-future-of-socket-level-multiplexing-1d5n) and the [original localtunnel](https://github.com/progrium/localtunnel),
Proxygram allows you to expose multiple tcp services from a local machine to the internet with static address.
It's tailored specifically to help people get started with building [Telegram mini apps](https://core.telegram.org/bots/webapps) without an extra hustle of setting up a server.

## How it works

Under the hood, proxygram utilises websockets (I plan to migrate to QUIC once it's implemented for the NodeJS) to establish a connection between your machine and the server. The server then routes the incoming requests to the appropriate websocket connection based on
the subdomain of the request. With the help of [tiny protocol](libs/utils/src/lib/protocol.ts) both proxygram server and client frame incoming tcp packets into websocket messages and vice versa, and multiplex them into a single websocket connection.

## Getting started
To get started with proxygram, you need to receive a token from the [ProxygramBot](https://t.me/DidntKnowProxygramTakenBot).

Run the proxygram cli with token and vhost configuration
```shell
npx proxygram -t {{TOKEN_FROM_BOT}} -H {{VHOST_CONFIG}}
```
or put the token and vhost configuration in the `.env` file
```text
PROXYGRAM_TOKEN={{TOKEN_FROM_BOT}}
PROXYGRAM_VHOSTS={{VHOST_CONFIG}}
```
and run the cli without arguments
```shell
npx proxygram
```

## Vhost configuration
This part is important as it tells the proxygram server how to route incoming requests to the appropriate websocket connection.
Vhost config consists of a list of vhost entries separated by a comma. Each vhost entry consists of a subdomain and a port separated by a colon.
```shell
PROXYGRAM_VHOSTS="subdomain1:port1,subdomain2:port2"
```
ports should be the same as the ports of the services you want to expose.

Subdomains should be unique and (!!!IMPORTANT!!!) should have suffix `-{{YOUR_TELEGRAM_USERNAME}}` otherwise the server will reject the connection.

## Example
Let's say you have the following services running on your machine:
- A webpack dev server on port `4200`
- A nodejs server on port `3000`

and your telegram username is `testuser`.

Then your vhost configuration could look like this:
```shell
PROXYGRAM_VHOSTS="frontend-testuser:4200,backend-testuser:3000"
```
proxygram will then route incoming requests to 
- `https://frontend-testuser.proxygr.am` to the webpack dev server 

and 
- `https://backend-testuser.proxygr.am` to the nodejs server.

You can also check the [example project](https://github.com/proxy-gram/mini-apps-starter)
