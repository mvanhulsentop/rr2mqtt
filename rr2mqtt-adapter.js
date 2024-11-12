"use strict";

const EventEmitter = require("node:events");
const fs = require("node:fs");

class RR2MqttAdapter extends EventEmitter {

	constructor(options) {
		super();

		this.language = "en";

		this.config = { ...options.config };

		/** @type {Set<NodeJS.Timeout>} */
		this._timers = new Set();

		/** @type {Set<NodeJS.Timeout>} */
		this._intervals = new Set();

		/**
		 * @type {{[key: string]: {val: any, ack: boolean}}}
		 */
		this.states = {};

		/**
		 * @type {{[key: string]: any}}
		 */
		this.objects = {};

		this.vacuums = {};

		/**
		 * @type {string[]}
		 */
		this.stateSubscriptions = [];

		this._logger = console;
		this.log = console;

		// create data directory if it  not exists
		if (!fs.existsSync("./data")) {
			fs.mkdirSync("./data");
		}

		// init states from file if available
		if (fs.existsSync("./data/states.json")) {
			const states = fs.readFileSync("./data/states.json", "utf8");
			this.states = JSON.parse(states);
		}

		// if (fs.existsSync('./objects.json')) {
		//   let objects = fs.readFileSync('./objects.json', 'utf8');
		//   this.objects = JSON.parse(objects);
		// }
	}

	/**
	 * Get Product Attribute for a Device
	 * @param {*} _duid Device ID
	 * @param {*} _attribute Attribute key
	 * @returns {any}
	 */
	getProductAttribute(_duid, _attribute) {
		throw new Error("Not implemented!");
	}

	/**
	 * A modify hook for 102 messages
	 * @param {string} duid Device ID
	 * @param {any} dps Data Point Payload
	 */
	async modify102(duid, dps) {

		const schema = this.getProductAttribute(duid, "schema");

		// translate 102 messages with datapoints directly, faster response
		for (const [key, value] of Object.entries(dps)) {

			const se = schema?.find(se => se.id === String(key));

			if (se) {
				// @TODO: Is deviceStatus always correct?
				this.setStateAsync(`Devices.${duid}.deviceStatus.${se.code}`, value, true).catch(error => {
					throw error;
				});
			}

			console.warn(`${JSON.stringify(se)}`);
		}
	}

	async _writeToFile(filename, data) {
		fs.writeFileSync(`./data/${filename}`, JSON.stringify(data, null, 2));
	}

	async _writeStatesToFile() {
		this._writeToFile("states.json", this.states);
	}

	async _writeObjectsToFile() {
		// this._writeToFile("objects.json", this.objects);
	}

	/**
	 * Subscribe states
	 * @param {string} id The id
	 */
	subscribeStates(id) {
		this._logger.log(`subscribeStates('${id}')`);

		if (this.stateSubscriptions.indexOf(id) == -1) {
			this.stateSubscriptions.push(id);

			const t = id.replaceAll(".", "/").replaceAll("*", "#");
			const topic = `${this.config.localMqttPrefix}/${t}`;
			this._logger.warn(`Add mqtt subscription ${topic} ...`);

			// emit custom event for main
			this.emit("addMqttTopic", t);
		}
	}

	/**
	 * Emit State change
	 * @param {string} id The id
	 * @param {any} state The state
	 */
	emitStateChange(id, state) {

		this.stateSubscriptions.forEach(sub => {
			if (sub.endsWith("*")) {
				if (id.startsWith(sub.substring(0, sub.length - 1))) {
					return this.emit("stateChange", `roborock.0.${id}`, state);
				}
			} else if (id == sub) {
				return this.emit("stateChange", `roborock.0.${id}`, state);
			}
		});

		return false;
	}

	async deleteStateAsync(id) {
		delete this.states[id];
		await this._writeStatesToFile();
	}

	async delObjectAsync(id) {
		delete this.states[id];
		await this._writeStatesToFile();
	}

	async setStateAsync(id, state, flag) {

		const state0 = flag ? { val: state, ack: true } : state;

		// update global state
		this.states[id] = state0;

		// emit this update for main.js
		this.emit("stateUpdate", id, state0);

		// write file if the state is the rr clientID, we need this after a restart
		if (id == "clientID") {
			await this._writeStatesToFile();
		}

		// emit state change, needed for rr adapter
		this.emitStateChange(id, state0);

		// write home data to data folder for debugging purpose
		if (id === "HomeData") {
			await this._writeToFile("homedata.json", JSON.parse(state0.val));
		}

		// write user data to data folder for debugging purpose
		if (id === "UserData") {
			await this._writeToFile("userdata.json", JSON.parse(state0.val));
		}
	}

	async setState(id, state, flag) {
		await this.setStateAsync(id, state, flag);
	}

	async setObjectNotExistsAsync(id, state) {
		if (!this.objects[id]) {
			await this.setObjectAsync(id, state);
		}
	}

	async setObjectAsync(id, state) {
		this.objects[id] = state;

		// emit this update for main.js
		this.emit("objectUpdate", id, state);

		await this._writeObjectsToFile();
	}

	async getStateAsync(id) {
		const r = this.states[id];
		return r;
	}

	async getObjectAsync(id) {
		return this.objects[id];
	}

	async setStateChangedAsync(id, state) {
		const oldState = this.states[id];
		if (!oldState || JSON.stringify(oldState.val) !== JSON.stringify(state.val)) {
			await this.setStateAsync(id, state);
		}
	}

	supportsFeature(_featureName) {
		return false;
	}

	getPluginInstance(_name) {
		return null;
	}

	setTimeout(cb, timeout, ...args) {
		const timer = setTimeout(
			() => {
				this._timers.delete(timer);
				cb(...args);
			},
			timeout,
		);
		this._timers.add(timer);
		return timer;
	}

	setInterval(cb, timeout, ...args) {

		if (typeof cb !== "function") {
			this._logger.error(
				`setInterval expected callback to be of type "function", but got "${typeof cb}"`,
			);
			return;
		}

		const id = setInterval(() => cb(...args), timeout);
		this._intervals.add(id);

		return id;
	}

	clearInterval(interval) {
		if (interval === undefined) {
			return;
		}

		// should we further validate it is a valid interval?
		clearInterval(interval);
		this._intervals.delete(interval);
	}

	clearTimeout(timer) {
		if (timer === undefined) {
			return;
		}

		// should we further validate this?
		clearTimeout(timer);
		this._timers.delete(timer);
	}
}

module.exports = {
	Adapter: RR2MqttAdapter
};
