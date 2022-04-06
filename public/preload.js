'use strict';

require('dotenv/config');
var Fastify = require('fastify');
require('electron');
require('node-cron');
var ethers = require('ethers');
var sequelize = require('sequelize');
var axios = require('axios');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var Fastify__default = /*#__PURE__*/_interopDefaultLegacy(Fastify);
var axios__default = /*#__PURE__*/_interopDefaultLegacy(axios);

// SQLite
const sqlite = new sequelize.Sequelize({
    dialect: 'sqlite',
    storage: './db/.ethers.sqlite',
    logging: false
});

sequelize.Sequelize.Op;

const defaultSettings = [
   {
      api_key: process.env.SERVER_API_KEY,
      latest_update: Date.now(),
   }
];

const dbSync = async (models) => {
   try {
      const { SettingsModel } = models;

      await sqlite.sync();
      await (async () => {
         const existSettings = await SettingsModel.findAll({ row: true });
         if(existSettings.length === 0) {
            SettingsModel.bulkCreate(defaultSettings);
         }
      })();
      } catch (err) {
         console.log(err);
         console.log('\x1b[31m%s\x1b[0m', 'Ошибка синхронизации таблиц');
   }
};

const { STRING, DATE, DECIMAL, BOOLEAN } = sequelize.DataTypes;

const SettingsModel = sqlite.define('settings', {
    api_key: {
        type: STRING
    },
    latest_update: {
        type: DATE,
    }
}, {
    tableName: 'settings',
    timestamps: false
});

const WalletModel = sqlite.define('wallets', {
    address: {
        type: STRING
    },
    phrase: {
        type: STRING
    },
    path: {
        type: STRING
    },
    locale: {
        type: STRING
    },
    privateKey: {
        type: STRING
    },
    addedMethod: {
        type: STRING
    },
    balance: {
        type: DECIMAL
    },
    balanceUsd: {
        type: DECIMAL
    },
    active: {
        type: BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'wallets',
});

dbSync({
    SettingsModel: SettingsModel
});

class WalletService {

	async getAllWallets() {
		try {
			const wallets = await WalletModel.findAll({
				where: {
					addedMethod: 'manual'
				}
			});
			if(wallets.length === 0) {
				return {
					error: true,
					errorType: 'noWallets',
					msg: `You have not added any wallet yet. Please add wallet...`,
				}
			}
			const successMsgWallets = `Кошельки получены`;
			return {
				error: false,
				msg: successMsgWallets,
				wallets: wallets,
			}
		} catch (error) {
			const errorMsg = `Ошибка получения кошельков ${address}`;
			console.log(error, errorMsg);
			return {
				error: true,
				msg: errorMsg
			}
		}
	}

	async removeActiveWallets() {
		const checkActiveWallets = await WalletModel.findAll({
			where: { active: true }
		});
		if(checkActiveWallets.length > 0) {
			checkActiveWallets.map(async (wallet) => {
				wallet.active = false;
				await wallet.save();
			});
		}
	}

	async generateWallet(address, privateKey, { phrase, path, locale }) {
		try {
			await WalletModel.create({
				address: address,
				phrase: phrase,
				path: path,
				locale: locale,
				addedMethod: 'random',
				balance: 0.00,
				balanceUsd: 0.00,
				active: true
			});
			const successMsg = `Кошелёк ${address} успешно создан`;
			console.log(successMsg);
			return {
				error: false,
				msg: successMsg,
				address: address,
				passphrase: privateKey
			}
		} catch (error) {
			const errorMsg = `Ошибка создания кошелька ${address}`;
			console.log(error, errorMsg);
			return {
				error: true,
				msg: errorMsg
			}
		}
	}

	async manualAddWallet({ adress, privateKey }, phrase, ethBalance, usdBalance) {
		try {
			const isExist = await WalletModel.findOne({ where: {address: adress}});
			const existMsg = `Wallet already exist: `;
			const successMsg = `Wallet successfully added:`;
			if(isExist) {
				console.log(existMsg);
				return {
					error: true,
					msg: existMsg,
					address: adress,
					phrase: phrase
				}
			}
			await WalletModel.create({
				address: adress,
				phrase: phrase,
				privateKey: privateKey,
				balance: ethBalance,
				balanceUsd: usdBalance,
				addedMethod: 'manual',
			});
			console.log(successMsg);
			return {
				error: false,
				msg: successMsg,
				address: adress,
				phrase: phrase
			}
		} catch (error) {
			const errorMsg = `Ошибка добавления кошелька ${adress}`;
			console.log(error, errorMsg);
			return {
				error: true,
				msg: errorMsg
			}
		}
	}

	async updateBalance(address, balance, usd) {
		const wallet = await WalletModel.findOne({ where: { address: address } });
		wallet.balance = parseFloat(balance);
		usd ? wallet.balanceUsd = usd : '';
		await wallet.save();
		return wallet.dataValues
	}

	async getPrivateKey(address) {
		const { dataValues } = await WalletModel.findOne({ where: { address: address } });
		return dataValues
	}

	async getActiveWallets() {
		const activeWallet = await WalletModel.findAll({
			where: { active: true }
		});
		return activeWallet
	}

	get formatDate() {
		const today = new Date();
		const days = today.toLocaleDateString('en-EN');
		const hours = `${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')}:${today.getSeconds()}`;
		return `<span>[${days}] [${hours}]</span>`
	}
}

class WalletController {
	constructor(network) {
		this.network = network;
		this.provider = ethers.ethers.getDefaultProvider(network, {
			etherscan: process.env.ETHERSCAN_API_KEY,
			infura: process.env.INFURA_API_KEY,
			alchemy: process.env.ALCHEMY_API_KEY,
			pocket: process.env.POCKET_API_KEY,
	  });
		// this.provider = new ethers.providers.EtherscanProvider(network)
		this.walletService = new WalletService();
	}

	async checkFirstStart(request) {
		await this.checkAuth(request);
		const activeWallet = await this.walletService.getActiveWallets();
		const newWallets = [];
		if(activeWallet.length === 0) {
			for (let adress of [1,2,3]) {
				let response = await this.generateWallet(request);
				const date = this.walletService.formatDate;
				response.msg = `${date} New wallet ${response.address}`;
				newWallets.push(response);
			}
			return newWallets
		}
		return false
	}

	async getAllWallets(request) {
		await this.checkAuth(request);
		return this.walletService.getAllWallets()
	}

	async updateWalletBalance(request) {
		await this.checkAuth(request);
		const { adress } = request.body;
		const actualBalance = await this.getBalance(adress);
		await this.walletService.updateBalance(adress, actualBalance.eth, actualBalance.usd);
		return actualBalance
	}

	async manualAddWallet(request) {
		await this.checkAuth(request);
		let { passPhrase } = request.body;
		// удаляем личшние пробелы
		passPhrase = passPhrase.replace(/^\s+|\s+$/g, '');
		passPhrase = passPhrase.replace(/^\s+/g, '');
		passPhrase = passPhrase.replace(/\s\s+/g, ' ');

		const checkLength = passPhrase.split(' ');
		let result = { error: true };
		if(checkLength.length !== 12) {
			result.msg = `Passphrase length\nmust be 12 words`;
			return result
		}
		if(!(/^[A-Za-z\s]*$/.test(passPhrase))) {
			result.msg = `Passphrase must contain \nonly latin characters`;
			return result
		}		try {
			const check = await this.getAdressFromPassPhrase(passPhrase);
			const { adress } = check;
			const date = this.walletService.formatDate;
			result.error = false;
			result.msg = `Wallet added successfully`;
			result.log = `${date} New wallet ${adress}`;
			result.adress = adress;
			const balance = await this.getBalance(adress);
			result.ethBalance = balance.eth.slice(0, 5);
			result.usdBalance = balance.usd;
			const isAdressExist = await this.walletService.manualAddWallet(result, passPhrase, parseFloat(balance.eth), balance.usd);
			if(isAdressExist.error) {
				result.error = true;
				result.msg = isAdressExist.msg;
			}
			return result
		} catch (error) {
			if(error?.message === 'invalid mnemonic') {
				result.msg = `No wallet found \nfor this passphrase`;
				return result
			}
		}
		// let msg = await this.walletService.manualAddWallet(address, phrase, parseFloat(balance.eth))
	}

	async generateWallet(request) {
		this.checkAuth(request);
		const randomSeed = ethers.ethers.Wallet.createRandom().connect(this.provider);
		const { address, privateKey, mnemonic } = randomSeed;
		const addNewWallet = await this.walletService.generateWallet(address, privateKey, mnemonic);
		return addNewWallet
	}

	async sendTransaction(request) {
		this.checkAuth(request);
		const { from, to } = request;
		const { privateKey } = await this.walletService.getPrivateKey(from);
		const balance = await this.getBalance(from);
		const transactionValue = balance.eth - 0.0005;
		const tx = {
			to: to,
			value: ethers.ethers.utils.parseEther(transactionValue.toString())
		};
		const wallet = new ethers.ethers.Wallet(privateKey, this.provider);
		const transaction = await wallet.sendTransaction(tx);
		console.log('txHash', transaction.hash);
		await this.walletService.updateBalance(from, balance - transactionValue);
	}

	async getBalance(address) {
		console.log('Проверка баланса');
		const balanceHex = await this.provider.getBalance(address);
		const balanceEth = await ethers.ethers.utils.formatEther(balanceHex);
		console.log(`Баланс получен ${balanceEth}`);
		// ethers.utils.parseEther(balance)
		console.log('Проверка курса');
		const calculate = parseFloat(balanceEth) * await this.getEtherPrice();
		console.log(`Курс получен. Баланс USD: ${calculate}`);
		return {
			eth: balanceEth,
			usd: parseFloat(parseFloat(calculate.toString()).toFixed(2))
		}
	}

	async getAdressFromPassPhrase(passphrase) {
		await ethers.ethers.getDefaultProvider(this.network);
		const mnemonicWallet = ethers.ethers.Wallet.fromMnemonic(passphrase);
		return {
			adress: mnemonicWallet.address,
			privateKey: mnemonicWallet.privateKey
		}
	}

	async getEtherPrice() {
		const apiURL = 'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD';
		const price = await axios__default["default"].get(apiURL);
		return price.data.USD
	}

	async checkAuth(request) {
		const token = request?.headers?.authorization?.split('Bearer ')[1];
		if(token !== process.env.SERVER_API_KEY) throw new Error('Unauthorized')
	}
}

// async function sendTransaction(request) {
	// const network = 'ropsten'
	// const provider = ethers.getDefaultProvider(network)
	// const provider = new ethers.providers.EtherscanProvider(this.network)
	// const sender = await new WalletService().manualFindByAdress(request.body.from)


	// const walletAdress = mnemonicWallet.address
	// const privateKey = mnemonicWallet.privateKey

	// const wallet = new ethers.Wallet(privateKey, provider)
	// const receiverAddress = '0xb96b5A0a472F2e6B4cf7C95448ec1dF572361ff9'
	// let amountInEther = '0.0001'
	// let tx = {
		// gasLimit: gasLimit,
		// gasPrice: gasPrice,
	// 	to: receiverAddress,
	// 	value: ethers.utils.parseEther(amountInEther)
	// }
	// const txObj = await wallet.sendTransaction(tx)
	// console.log('txHash', txObj.hash)
// }

const wallet = new WalletController('ropsten'); // homestead

const fastify = Fastify__default["default"]();
fastify.register(Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require('fastify-cors')); }), {});

fastify.get('/getAllWallets', async (request, reply) => {
	const allWallets = await wallet.getAllWallets(request);
	return allWallets
});
fastify.post('/manualAddWallet', async (request, reply) => {
	const addedWallet = await wallet.manualAddWallet(request);
	return addedWallet
});
fastify.get('/generateWallet', async (request, reply) => {
	const generatedWallet = await wallet.generateWallet(request);
	return generatedWallet
});
fastify.post('/sendTransaction', async (request, reply) => {
	const sended = await wallet.sendTransaction(request);
	return sended
});
fastify.post('/updateWalletBalance', async (request, reply) => {
	const sended = await wallet.updateWalletBalance(request);
	return sended
});
fastify.get('/checkFirstStart', async (request, reply) => {
	const sended = await wallet.checkFirstStart(request);
	return sended
});


const PORT = process.env.SERVER_PORT;

// Run the server
const start = async () => {
	try {
		const address = await fastify.listen(PORT);
		console.log('\x1b[36m%s\x1b[0m', `Сервер запущен: ${address}`);
		window.APP_PORT = address;
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();

// cron.schedule('* * * * *', () => {
// 	console.log('running a task every minute');
// });
//
// try {
// 	const request = {
// 			"from": "0x7C985582df0dC7F93F678D59B1A5E82508780496",
// 			"to": "0x25277505Fd4292fa3EA2D5E968E44C2D24A7abCb"
// 	}
// 	const transaction = await wallet.sendTransaction(request)
// 	// console.log(wallet2)
// } catch (error) {
// 	console.log(error)
// 	console.log('!!!!!!!!!!!')
// }
// try {
// 	const wallet2 = await wallet.generateWallet()
// 	console.log(wallet2)
// } catch (error) {
// 	console.log(error)
// 	console.log('!!!!!!!!!!!')
// }
//
// try {
// 	const wallet2 = await wallet.generateWallet()
// 	console.log(wallet2)
// } catch (error) {
// 	console.log(error)
// 	console.log('!!!!!!!!!!!')
// }
//
// try {
// 	const balance = await wallet.getBalance({
// 		adress: '0x7C985582df0dC7F93F678D59B1A5E82508780496'
// 	})
// 	console.log(balance.usd)
// } catch (error) {
// 	console.log(error)
// 	console.log('!!!!!!!!!!!')
// }
