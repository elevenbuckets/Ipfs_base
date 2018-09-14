'use strict';
const ipfsctl = require('ipfsd-ctl');
const ipfsAPI = require('ipfs-api');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

class IPFS_GO {
	constructor(cfpath) {
                const __watcher = (cfpath) => {
                        console.log("go_ipfs: No config found, watcher triggered ...");
                        let cfgw = fs.watch(path.dirname(cfpath), (e, f) => {
                                console.log(`CastIron::__watcher: got fsevent ${e} on ${f}`);
                                if ((e === 'rename' || e === 'change') && f === path.basename(cfpath) && fs.existsSync(cfpath)) {
					console.log("go_ipfs: stopping service due to reconfigure")
					this.stop().then(() => {
                                        	console.log("go_ipfs: got config file, parsing ...");
                                        	let buffer = fs.readFileSync(cfpath);
                                        	this.cfsrc = JSON.parse(buffer.toString());
						this.options = {args: ['--enable-pubsub-experiment'], disposable: false, init: true, repoPath: this.cfsrc.repoPathGo};

						if (typeof(this.cfsrc.ipfsBinary) === 'undefined') {
							let goipfspath = path.dirname(path.dirname(require.resolve('go-ipfs-dep')));
							this.cfsrc.ipfsBinary = path.join(goipfspath, 'go-ipfs', 'ipfs');
						}
					})
					.then(() => { console.log("IPFS restarting ..."); return this.start(); })
                                }
                        })
                }

		try {
			let buffer = fs.readFileSync(cfpath);
			this.cfsrc = JSON.parse(buffer.toString());
			this.options = {args: ['--enable-pubsub-experiment'], disposable: false, init: true, repoPath: this.cfsrc.repoPathGo};

			if (typeof(this.cfsrc.ipfsBinary) === 'undefined') {
				let goipfspath = path.dirname(path.dirname(require.resolve('go-ipfs-dep')));
				this.cfsrc.ipfsBinary = path.join(goipfspath, 'go-ipfs', 'ipfs');
			}
		} catch (err) {
			let goipfspath = path.dirname(path.dirname(require.resolve('go-ipfs-dep')));
			this.cfsrc = {
				repoPathGo: '/tmp/ipfs_tmp',
				lockerpathgo: '/tmp/.locker_go',
				ipfsBinary: path.join(goipfspath, 'go-ipfs', 'ipfs')
			};
			this.options = {args: ['--enable-pubsub-experiment'], disposable: true, init: true, repoPath: this.cfsrc.repoPathGo};
		}

		if (this.options.disposable === false && fs.existsSync(this.cfsrc.lockerpathgo)) this.options.init = false;
		if (this.options.init) {
			console.log(`Initializing IPFS repo at ${this.cfsrc.repoPathGo} ...`);
			execFile(`${this.cfsrc.ipfsBinary} init`, {env: {IPFS_PATH: this.cfsrc.repoPathGo}}, (err, stdout, stderr) => {
				if (err) console.log(stdout); consolog(stderr); throw(err);
				this.ipfsd = ipfsctl.create({type: 'go', exec: this.cfsrc.ipfsBinary});
			})
		} else {
			this.ipfsd = ipfsctl.create({type: 'go', exec: this.cfsrc.ipfsBinary});
		}
	}
	
	start = () => {
                const __spawn = (resolve, reject) => {
                        this.ipfsd.spawn(this.options, (err, ipfsFactory) => {
                                if (err) return reject(err);

                                if (!this.options.disposable) fs.writeFileSync(this.cfsrc.lockerpathgo, JSON.stringify(this.cfsrc,0,2));

				ipfsFactory.start(this.options.args, (err) => {
                                	if (err) return reject(err);

					process.on('SIGINT', () => {
						if (this.controller.started) {
							console.log("\tCtrl+C or SIGINT detected ... stopping...");
							this.stop().then(() => {
								fs.unlinkSync(path.join(this.cfsrc.repoPathGo, 'api'));
								fs.unlinkSync(path.join(this.cfsrc.repoPathGo, 'repo.lock'));
							});
						}
					});

					process.on('exit', () => {
						if (this.controller.started) {
							this.stop().then(() => {
								fs.unlinkSync(path.join(this.cfsrc.repoPathGo, 'api'));
								fs.unlinkSync(path.join(this.cfsrc.repoPathGo, 'repo.lock'));
							});
						}
					});

					this.controller = ipfsFactory;
					let apiAddr = ipfsFactory.api.apiHost;
					let apiPort = ipfsFactory.api.apiPort;
					this.ipfsAPI = ipfsAPI(apiAddr, apiPort, {protocol: 'http'})

					console.log("repoPath: " + ipfsFactory.repoPath)

                                	resolve(this.ipfsAPI);
				})
                        });
                }

                return new Promise(__spawn);
        }

        stop = (graceTime = 31500) => {
                const __stop = (resolve, reject) => {
                        this.controller.stop(graceTime, (err) => {
                                if (err) return reject(false);
                                resolve(true);
                        })
                }

                return new Promise(__stop);
        }

	put = (fpath) => {
		let buff = fs.readFileSync(fpath);
		return this.ipfsAPI.files.add(buff); // return a promise
	}

	lspin = () => { return this.ipfsAPI.pin.ls(); }

	read = (hash) => { return this.ipfsAPI.files.cat('/ipfs/' + hash); }

	readPath = (ipfsPath) => { return this.ipfsAPI.files.cat(ipfsPath); }

	publish = (contentHash, key=null) => {
		let options = {};

		if (key !== null) options['key'] = key;
		return this.ipfsAPI.name.publish(contentHash, options);
	}

	resolve = (ipnsHash) => {
		return this.ipfsAPI.name.resolve(ipnsHash);
	}
}

module.exports = IPFS_GO;
