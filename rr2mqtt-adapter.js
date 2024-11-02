"use strict";

const EventEmitter = require("node:events");
const fs = require("node:fs");

class FakeAdapter extends EventEmitter {

	constructor(options) {
		super();

		this.language = "en";

		// this.options = options;
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

		this._logger = {
			log(message, ...optionalParams) {
				console.log(message, optionalParams);
			},
			error(message, ...optionalParams) {
				console.error(message, optionalParams);
			},
			info(message, ...optionalParams) {
				console.info(message, optionalParams);
			},
			debug(message, ...optionalParams) {
				console.debug(message, optionalParams);
			},
			warn(message, ...optionalParams) {
				console.warn(message, optionalParams);
			}
		};

		this.log = this._logger;

		if (fs.existsSync("./data/states.json")) {
			const states = fs.readFileSync("./data/states.json", "utf8");
			this.states = JSON.parse(states);
		}

		// if (fs.existsSync('./objects.json')) {
		//   let objects = fs.readFileSync('./objects.json', 'utf8');
		//   this.objects = JSON.parse(objects);
		// }
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
	 * x
	 * @param {*} id x
	 */
	subscribeStates(id) {
		console.log(`subscribeStates('${id}')`);

		if (this.stateSubscriptions.indexOf(id) == -1) {
			this.stateSubscriptions.push(id);

			const t = id.replaceAll(".", "/").replaceAll("*", "#");
			const topic = `${this.config.localMqttPrefix}/${t}`;
			console.warn(`Add mqtt subscription ${topic} ...`);

			this.emit("addMqttTopic", t);
		}
	}

	/**
	 * x
	 * @param {string} id x
	 */
	emitStateChange(id, state0) {

		this.stateSubscriptions.forEach(sub => {
			if (sub.endsWith("*")) {
				if (id.startsWith(sub.substring(0, sub.length - 1))) {
					return this.emit("stateChange", `roborock.0.${id}`, state0);
				}
			} else if (id == sub) {
				return this.emit("stateChange", `roborock.0.${id}`, state0);
			}
		});

		return false;
	}

	async delObjectAsync(id) {
		console.log(`deleteStateAsync('${id}')`);
		delete this.states[id];

		await this._writeStatesToFile();
	}

	async setStateAsync(id, state, flag) {

		const state0 = flag ? { val: state, ack: true } : state;

		console.log(`setStateAsync('${id}', '${JSON.stringify(state0)}, ${flag}')`);

		// const oldState = this.states[id];

		this.states[id] = state0;

		this.emit("stateUpdate", id, state0);

		// if (JSON.stringify(oldState) !== JSON.stringify(state0)) {

		if (id == "clientID") {
			await this._writeStatesToFile();
		}
		this.emitStateChange(id, state0);
		// }

		if (id === "HomeData") {
			await this._writeToFile("homedata.json", JSON.parse(state0.val));
		}
		if (id === "UserData") {
			await this._writeToFile("userdata.json", JSON.parse(state0.val));
		}
	}

	async setState(id, state, flag) {
		await this.setStateAsync(id, state, flag);
	}

	async setObjectNotExistsAsync(id, state) {
		console.log(`setObjectNotExistsAsync('${id}', '${JSON.stringify(state)}')`);
		if (!this.objects[id]) {
			await this.setObjectAsync(id, state);
		}
	}

	async setObjectAsync(id, state) {
		console.log(`setObjectAsync('${id}', '${JSON.stringify(state)}')`);
		this.objects[id] = state;

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

		// const state0 = flag ? { val: state, ack: true } : state;
		const oldState = this.states[id];

		// this.states[id] = state0;

		// this.emit("stateUpdate", id, state0);

		if (!oldState || JSON.stringify(oldState.val) !== JSON.stringify(state.val)) {
			await this.setStateAsync(id, state);
		}
	}

	/**
	 * x
	 * @param {string} _featureName x
	 * @returns x
	 */
	supportsFeature(_featureName) {
		return false;
	}

	/**
	 * x
	 * @param {*} _name x
	 * @returns x
	 */
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
	Adapter: FakeAdapter
};
