# Project rr2mqtt

This project is a Roborock Vacuum to Mqtt bridge, hence **rr2mqtt**. This project is largely based on the ioBroker project [ioBroker.roborock](https://github.com/copystring/ioBroker.roborock). However, **rr2mqtt** runs without ioBroker Standalone as node.js application or in a Docker container.

There is currently no ready-made image on DockerHub, you have to build the image yourself. However, this is easy and does not require any installation other than Docker.

## Getting start

### Docker

- Clone this repository
- Create a config file `config.env` from `config.template.env`. Add you data in the file.
- Run `docker-compose` to build an run **rr2mqtt**

```shell
docker-compose up --build
```

### Local

- Clone this repository
- Run `./prep-local-dev` in a linux shell (MINGW64 on windows) once
- Change into subdirectory`` cd ioBroker.roborock/``
- Create a config file `config.env` from `config.template.env`. Add you data in the file.
  - Replace ``:`` with ``=``
- Run ``node --env-file=config.env rr2mqtt-main.js`` to start **rr2mqtt**

## MQTT

```mqtt
rr2mqtt/states/Devices/<DEVICE-ID>
```

### Commands

#### load_multi_map

Set a floor

| Key     | Value                                                 |
| ------- | ----------------------------------------------------- |
| Topic   | `rr2mqtt/Devices/[DEVICE-ID]/commands/load_multi_map` |
| Payload | `1` or `2`                                            |

#### app_segment_clean

Start room cleaning. You can use the enhanced JSON format to configurate the rooms.
See `rr2mqtt/objects/Devices/[DEVICE-ID]/floors/[NUMBER]` for room names and ids.

| Key     | Value                                                    |
| ------- | -------------------------------------------------------- |
| Topic   | `rr2mqtt/Devices/[DEVICE-ID]/commands/app_segment_clean` |
| Payload | `true` or `{"rooms": [19], "cleanCount": 2}`             |

#### stop_segment_clean

| Key     | Value                                                        |
| ------- | ------------------------------------------------------------ |
| Topic   | `rr2mqtt/Devices/**[DEVICE-ID]**/commands/app_segment_clean` |
| Payload | `true`                                                       |

#### startProgram

| Key     | Value                                                        |
| ------- | ------------------------------------------------------------ |
| Topic   | `rr2mqtt/Devices/[DEVICE-ID]/programs/startProgram` |
| Payload | `Program ID` |

#### reset_consumables

| Key     | Value                                                        |
| ------- | ------------------------------------------------------------ |
| Topic   | `rr2mqtt/Devices/[DEVICE-ID]/reset_consumables/*` |
| Payload | `?` |

See for more commands [Objekte und ihre Bedeutung](https://github.com/copystring/ioBroker.roborock/wiki/Objekte-und-ihre-Bedeutung#commands) from ioBroker roborock Wiki page.

## Warning

This project is at an early stage and is not stable. A lot will change in the coming weeks.
