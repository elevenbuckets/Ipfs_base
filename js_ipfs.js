'use strict';
const IPFS = require('ipfs');
const fs = require('fs');
const path = require('path');

class IPFS_GO {
	constructor(cfpath) {
		let buffer = fs.readFileSync(cfpath);
		this.cfsrc = JSON.parse(buffer.toString());
		this.options = {EXPERIMENTAL: {pubsub: true}, init: true, repo: this.cfsrc.repoPath, relay: {enabled: true, hop: { enabled: true}}};

		if (fs.existsSync(this.cfsrc.lockerpath)) this.options.init = false;

		this.ipfs = new IPFS(this.options);
		this.ready = false;
	}

	start = () => {
		return new Promise((resolve, reject) => {
			this.ipfs.on('ready', () => {
        	                fs.writeFileSync(this.cfsrc.lockerpath, JSON.stringify(this.cfsrc,0,2));
				process.on('SIGINT', () => {
					console.log("\tCtrl+C or SIGINT detected ... stopping...");
					this.ipfs.stop().then(() => {
						console.log("Bye!");
					});
				});
				this.ready = true;

				resolve();
			})
		});
	}
	
        stop = () => { 
		if (this.ipfs.isOnline()) {
			this.ready = false;
			return this.ipfs.stop(); 
		}
	}

	put = (fpath) => {
		let buff = fs.readFileSync(fpath);
		return this.ipfs.files.add(buff); // return a promise
	}

	lspin = () => { 
		if (!this.ipfs.isOnline()) return new Promise(this.lspin);
		return this.ipfs.pin.ls(); 
	}

	read = (hash) => { return this.ipfs.files.cat('/ipfs/' + hash); }

	readPath = (ipfsPath) => { return this.ipfs.files.cat(ipfsPath); }

	/*
	publish = (contentHash, key=null) => {
		let options = {};

		if (key !== null) options['key'] = key;
		return this.ipfs.name.publish(contentHash, options);
	}

	resolve = (ipnsHash) => {
		return this.ipfs.name.resolve(ipnsHash);
	}
	*/
}

module.exports = IPFS_GO;
