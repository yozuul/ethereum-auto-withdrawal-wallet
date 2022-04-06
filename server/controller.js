import { ethers } from 'ethers'
import { WalletService } from './service'
import axios from 'axios'

export class WalletController {
	constructor(network) {
		this.network = network
		this.provider = ethers.getDefaultProvider(network, {
			etherscan: process.env.ETHERSCAN_API_KEY,
			infura: process.env.INFURA_API_KEY,
			alchemy: process.env.ALCHEMY_API_KEY,
			pocket: process.env.POCKET_API_KEY,
	  });
		// this.provider = new ethers.providers.EtherscanProvider(network)
		this.walletService = new WalletService()
	}

	async checkBalance() {
		const updateActiveWallets = await this.isUpdateActiveWallets()
	}

	async isUpdateActiveWallets() {
		const { dataValues } = await this.walletService.getSettings()
		const nextUpdate = new Date(dataValues.latest_update).getDay()
		console.log(nextUpdate)
		console.log(new Date(dataValues.latest_update).getDay())
	}

	async checkFirstStart(request) {
		await this.checkAuth(request)
		const activeWallet = await this.walletService.getActiveWallets()
		const newWallets = []
		if(activeWallet.length === 0) {
			for (let adress of [1,2,3]) {
				let response = await this.generateWallet(request)
				const date = this.walletService.formatDate
				response.msg = `${date} New wallet ${response.address}`
				newWallets.push(response)
			}
			return newWallets
		}
		return false
	}

	async getAllWallets(request) {
		await this.checkAuth(request)
		return this.walletService.getAllWallets()
	}

	async updateWalletBalance(request) {
		await this.checkAuth(request)
		const { adress } = request.body
		const actualBalance = await this.getBalance(adress)
		await this.walletService.updateBalance(adress, actualBalance.eth, actualBalance.usd)
		return actualBalance
	}

	async manualAddWallet(request) {
		await this.checkAuth(request)
		let { passPhrase } = request.body
		// удаляем личшние пробелы
		passPhrase = passPhrase.replace(/^\s+|\s+$/g, '')
		passPhrase = passPhrase.replace(/^\s+/g, '')
		passPhrase = passPhrase.replace(/\s\s+/g, ' ')

		const checkLength = passPhrase.split(' ')
		let result = { error: true }
		if(checkLength.length !== 12) {
			result.msg = `Passphrase length\nmust be 12 words`
			return result
		}
		if(!(/^[A-Za-z\s]*$/.test(passPhrase))) {
			result.msg = `Passphrase must contain \nonly latin characters`
			return result
		};
		try {
			const check = await this.getAdressFromPassPhrase(passPhrase)
			const { adress } = check
			const date = this.walletService.formatDate
			result.error = false
			result.msg = `Wallet added successfully`
			result.log = `${date} New wallet ${adress}`
			result.adress = adress
			const balance = await this.getBalance(adress)
			result.ethBalance = balance.eth.slice(0, 5)
			result.usdBalance = balance.usd
			const isAdressExist = await this.walletService.manualAddWallet(result, passPhrase, parseFloat(balance.eth), balance.usd)
			if(isAdressExist.error) {
				result.error = true
				result.msg = isAdressExist.msg
			}
			return result
		} catch (error) {
			if(error?.message === 'invalid mnemonic') {
				result.msg = `No wallet found \nfor this passphrase`
				return result
			}
		}
		// let msg = await this.walletService.manualAddWallet(address, phrase, parseFloat(balance.eth))
	}

	async generateWallet(request) {
		this.checkAuth(request)
		const randomSeed = ethers.Wallet.createRandom().connect(this.provider)
		const { address, privateKey, mnemonic } = randomSeed
		const addNewWallet = await this.walletService.generateWallet(address, privateKey, mnemonic)
		return addNewWallet
	}

	async sendTransaction(request) {
		this.checkAuth(request)
		const { from, to } = request
		const { privateKey } = await this.walletService.getPrivateKey(from)
		const balance = await this.getBalance(from)
		const transactionValue = balance.eth - 0.0005
		const tx = {
			to: to,
			value: ethers.utils.parseEther(transactionValue.toString())
		}
		const wallet = new ethers.Wallet(privateKey, this.provider)
		const transaction = await wallet.sendTransaction(tx)
		console.log('txHash', transaction.hash)
		await this.walletService.updateBalance(from, balance - transactionValue)
	}

	async getBalance(address) {
		console.log('Проверка баланса')
		const balanceHex = await this.provider.getBalance(address)
		const balanceEth = await ethers.utils.formatEther(balanceHex)
		console.log(`Баланс получен ${balanceEth}`)
		// ethers.utils.parseEther(balance)
		console.log('Проверка курса')
		const calculate = parseFloat(balanceEth) * await this.getEtherPrice()
		console.log(`Курс получен. Баланс USD: ${calculate}`)
		return {
			eth: balanceEth,
			usd: parseFloat(parseFloat(calculate.toString()).toFixed(2))
		}
	}

	async getAdressFromPassPhrase(passphrase) {
		await ethers.getDefaultProvider(this.network)
		const mnemonicWallet = ethers.Wallet.fromMnemonic(passphrase)
		return {
			adress: mnemonicWallet.address,
			privateKey: mnemonicWallet.privateKey
		}
	}

	async getEtherPrice() {
		const apiURL = 'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD'
		const price = await axios.get(apiURL)
		return price.data.USD
	}

	async checkAuth(request) {
		const token = request?.headers?.authorization?.split('Bearer ')[1]
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