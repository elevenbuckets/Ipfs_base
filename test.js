'use strict';

const ipfs_go = require('./IPFS_GO.js');
const fs = require('fs');
let ipfs = new ipfs_go('./.local/config.json');

ipfs.start()
  .then(() => {
	return ipfs.ipfsAPI.id();	
  })
  .then((r) => {
	console.log(r);
	return ipfs.put('/home/jasonlin/Downloads/config.json')
  })
  .then((res) => {
        console.log(res);
        let hash = res[0].hash;
        return Promise.all([ipfs.read(hash), Promise.resolve(hash)]);
  })
  .then((rlist) => {
	let data = rlist[0];
	let hash = rlist[1];
	console.log(data.toString());
	console.log(`ipfs hash = ${hash}`);
	return ipfs.publish(`/ipfs/${hash}`)
  })
  .then((r) => {
	console.log(r);
	return ipfs.resolve(`/ipns/${r.name}`);
  })
  .then((ipfsPath) => {
	console.log(`resolved IPNS to IPFS Path:`);
	console.log(ipfsPath);
	return ipfs.readPath(ipfsPath);
  })
  .then((r) => {
	console.log(r.toString());
  })
  .catch((err) => {
	console.log(err);
	process.exit(12);
  })
