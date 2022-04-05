import { ethers } from 'ethers'
import { WalletService } from './service'

export class WalletController {
	constructor(network) {
		this.network = network
		this.provider = ethers.getDefaultProvider(network, {
			etherscan: process.env.ETHERSCAN_API_KEY,
			infura: process.env.INFURA_API_KEY
	  });
		// this.provider = new ethers.providers.EtherscanProvider(network)
		this.walletService = new WalletService()
	}

	async manualAddWallet(request) {
		await this.checkAuth(request)
		const { phrase } = request.body
		const address = await this.getAdressFromPassPhrase(phrase)
		const balance = await this.getBalance(address.adress)
		return this.walletService.manualAddWallet(address, phrase, parseFloat(balance.eth))
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

	async showBalance() {
		this.checkAuth(request)
		const { address } = request
		return await this.getBalance(address)
	}

	async getBalance(address) {
		const balanceHex = await this.provider.getBalance(address)
		const balanceEth = await ethers.utils.formatEther(balanceHex)
		// ethers.utils.parseEther(balance)
		const calculate = parseFloat(balanceEth) * await this.getEtherPrice()
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
		return new ethers.providers.EtherscanProvider('homestead').getEtherPrice()
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