'use strict';
const ipfsctl = require('ipfsd-ctl');
const ipfsAPI = require('ipfs-api');
const fs = require('fs');
const path = require('path');

class IPFS_GO {
	constructor(cfpath) {
		let buffer = fs.readFileSync(cfpath);
		this.cfsrc = JSON.parse(buffer.toString());
		this.options = {args: ['--enable-pubsub-experiment'], disposable: false, init: true, repoPath: this.cfsrc.repoPath};

		if (fs.existsSync(this.cfsrc.lockerpath)) this.options.init = false;

		this.ipfsd = ipfsctl.create({type: 'go', exec: this.cfsrc.ipfsBinary});
	}
	
	start = () => {
                const __spawn = (resolve, reject) => {
                        this.ipfsd.spawn(this.options, (err, ipfsFactory) => {
                                if (err) return reject(err);

                                fs.writeFileSync(this.cfsrc.lockerpath, JSON.stringify(this.cfsrc,0,2));

				ipfsFactory.start(this.options.args, (err) => {
                                	if (err) return reject(err);

					process.on('SIGINT', () => {
						if (this.controller.started) {
							console.log("\tCtrl+C or SIGINT detected ... stopping...");
							this.stop().then(() => {
								fs.unlinkSync(path.join(this.cfsrc.repoPath, 'api'));
								fs.unlinkSync(path.join(this.cfsrc.repoPath, 'repo.lock'));
							});
						}
					});

					process.on('exit', () => {
						if (this.controller.started) {
							this.stop().then(() => {
								fs.unlinkSync(path.join(this.cfsrc.repoPath, 'api'));
								fs.unlinkSync(path.join(this.cfsrc.repoPath, 'repo.lock'));
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
}

module.exports = IPFS_GO;