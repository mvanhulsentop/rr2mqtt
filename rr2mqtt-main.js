"use strict";

const Roborock = require("./main");
const mqtt = require("mqtt");

class Rr2MqttMain {

	constructor() {

		const that = this;
		this.localMqttUrl = process.env["LOCAL_MQTT"] || "undefined";
		this.localMqttPrefix = "aaa-rr2";

		/** @type {ReturnType<typeof Roborock>} */
		this.roborock = Roborock({
			config: {
				username: process.env["RR_USERNAME"],
				password: process.env["RR_PASSWORD"],
				enable_map_creation: true,
				map_creation_interval: 60,
				updateInterval: 30,
			}
		});

		// submit all rr state updates to local mqtt
		this.roborock.on("stateUpdate", (id, state) => {
			that.publishMqtt(id, state, "states");
		});

		// submit all rr object updates to local mqtt
		this.roborock.on("objectUpdate", (id, state) => {
			that.publishMqtt(id, state, "objects");
		});

		// react on all rr subscript states via local mqtt
		this.roborock.on("addMqttTopic", (t) => {
			const topic = `${that.localMqttPrefix}/${t}`;
			that.mqttClient.subscribe(topic);
		});

		this.mqttClient = mqtt.connect(this.localMqttUrl, {});
		this.mqttClient.on("message", this._onMessageCallback.bind(this));
		this.mqttClient.on("connect", () => {

			that.roborock.log.info("Local mqqt client connected!");

			// submit all states after a connect
			Object.entries(that.roborock.objects).forEach(([id, obj]) => {
				that.publishMqtt(id, obj, "objects");
			});

			// submit all objects after a connect
			Object.entries(that.roborock.states).forEach(([id, state]) => {
				that.publishMqtt(id, state, "states");
			});
		});

		// mark rr as ready to start then program
		this.mqttClient.once("connect", () => {
			this.roborock.emit("ready");
		});
	}

	/**
		* x
		* @param {string} topic x
		* @param {Buffer} message x
		*/
	_onMessageCallback(topic, message) {
		(async (topic, message) => {

			const data = JSON.parse(message.toString());

			// const data = JSON.stringify(message.toJSON());
			console.log(`TOPIC: ${topic} -> ${JSON.stringify(data)}`);

			const id = topic.replace(`${this.localMqttPrefix}/`, "").replaceAll("/", ".");
			const idSegments = id.split(".");
			const duid = idSegments[1];

			if (idSegments[0] === "Devices" && idSegments[2] === "commands") {
				const command = idSegments[3];
				await this._onCommand(command, data, duid);
			}

		})(topic, message).catch(error => {
			this.roborock.log.error(error);
		});
	};

	async _onCommand(command, data, duid) {
		if (command === "app_segment_clean") {
			const roomFloor = await this.roborock.getStateAsync(`Devices.${duid}.deviceStatus.map_status`);

			if (!roomFloor) {
				throw new Error("No floor information available!");
			}

			const cleanCount = Math.min(Math.max(data.cleanCount, 1), 2);

			if (!Array.isArray(data.rooms)) {
				throw new Error(`Room numbers are not of type array!'`);
			}

			data.rooms.forEach(room => {
				if (!Number.isInteger(Number(room))) {
					throw new Error(`Room number '${room} is not a valid number!'`);
				}
			});

			// const rooms = [17, 18];

			for (const [key, value] of Object.entries(this.roborock.objects)) {
				if (key.startsWith(`Devices.${duid}.floors.${roomFloor.val}.`)) {
					console.warn(`XXXXXXXXXXX -> ${key} - ${value} --> ${key.split(".")[4]}`);
					await this.roborock.setStateAsync(key, data.rooms.includes(Number(key.split(".")[4])), true);
				}
			}

			await this.roborock.setStateAsync(`Devices.${duid}.floors.cleanCount`, { val: cleanCount, ack: true });

			data = true;
			// for (const key in object) {
			// 	if (Object.prototype.hasOwnProperty.call(object, key)) {
			// 		const element = object[key];
			// 		array.forEach(element => {

			// 		});
			// 	}
			// }


			// Object.entries(this.roborock.objects).forEach(([key, value]) => {
			// 	if (key.startsWith(`Devices.${duid}.floors.${roomFloor.val}.`)) {
			// 		console.warn(`XXXXXXXXXXX -> ${key} - ${value} --> ${key.split(".")[4]}`);
			// 		await this.roborock.setStateAsync(key, rooms.includes(Number(key.split(".")[4])), true);
			// 	}
			// });

		}// else {

		this.roborock.setStateAsync(`Devices.${duid}.commands.${command}`, { val: data, ack: false }, false);
		// }
	}

	/**
	 * x
	 * @param {*} id x
	 * @param {*} state x
	 * @param {*} type x
	 */
	publishMqtt(id, state, type) {
		if (this.mqttClient && this.mqttClient.connected) {
			const key = id.replaceAll(".", "/");
			const topic = `${this.localMqttPrefix}/${type}/${key}`;

			if (type === "states") {

				// this.mqttClient.publish(topic, JSON.stringify(state.val));

				const obj = this.roborock.objects[id];
				const rawValue = JSON.stringify(state.val);

				if (obj && obj.common && obj.common.states && obj.common.states[rawValue]) {
					//  if (obj.common && obj.common.states && obj.common.states[rawValue]) {
					this.mqttClient.publish(topic, obj.common.states[rawValue]);
					// }
				} else {
					this.mqttClient.publish(topic, JSON.stringify(state.val));
				}

			} else {
				this.mqttClient.publish(topic, JSON.stringify(state));
			}
		}
	};

}

const main = async () => {
	new Rr2MqttMain();
};

main();