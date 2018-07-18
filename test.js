'use strict';

const ipfs_go = require('./IPFS_GO.js');
const fs = require('fs');
let ipfs = new ipfs_go('./.local/config.json');

let entry = ipfs.start();

entry.then((API) => {
	API.config.get()
	.then((cfg) => {
		console.log(cfg.toString())
		return ipfs.put('/home/jasonlin/Downloads/config.json');
	})
	.then((res) => {
		console.log(res);
		let hash = res[0].hash;
		return ipfs.read(hash);
	})
	.then((data) => {
		console.log(data.toString());
	})
	.then(() => {
		ipfs.stop();
	})
})
.catch((err) => {
	console.log(err);
	process.exit(12);
})
