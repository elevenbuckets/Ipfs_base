'use strict';

const ipfs_go = require('./IPFS_Base.js');
const fs = require('fs');
let ipfs = new ipfs_go('./.local/config.json');

ipfs.start()
  .then(() => {
	ipfs.put('/home/jasonlin/Downloads/config.json')
	.then((res) => {
		console.log(res);
		let hash = res[0].hash;
		return ipfs.read(hash);
	})
	.then((data) => {
		return console.log(data.toString());
	})
  })
  .catch((err) => {
	console.log(err);
	process.exit(12);
  })

