# Project rr2mqtt

This project is a Roborock Vacuum to Mqtt bridge, hence __rr2mqtt__. This project is largely based on the ioBroker project [ioBroker.roborock](https://github.com/copystring/ioBroker.roborock). However, __rr2mqtt__ runs without ioBroker Standalone as node.js application or in a Docker container.

There is currently no ready-made image on DockerHub, you have to build the image yourself. However, this is easy and does not require any installation other than Docker.

## Getting start

- Clone this repository 
- Create a config file ``config.env`` from ``config.template.env``. Add you data in the file.
- Run ``docker-compose`` to build an run __rr2mqtt__

```bash
docker-compose up --build
```

## Warning

This project is at an early stage and is not stable. A lot will change in the coming weeks.