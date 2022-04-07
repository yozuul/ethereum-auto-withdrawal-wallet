import path from 'path'
import { writeFile, readFile } from 'fs/promises'
import { ethers } from 'ethers'
import axios from 'axios'
import xlsx from 'node-xlsx'

import { WalletService } from './service'

export class WalletController {
	constructor(network) {
		this.network = network
		this.provider = ethers.getDefaultProvider(network, {
			etherscan: process.env.ETHERSCAN_API_KEY,
			infura: process.env.INFURA_API_KEY,
			alchemy: process.env.ALCHEMY_API_KEY,
			pocket: process.env.POCKET_API_KEY,
	  });
		this.walletService = new WalletService()
	}

	async generateExcel(request) {
		await this.checkAuth(request)
		const wallets = await this.walletService.getAllRandomGeneratedWallet()
		const balance = []
		for (let wallet of wallets) {
			const adress = wallet.address
			const checkBalance = await this.getBalance(adress)
			balance.push([
				adress, wallet.phrase, checkBalance.eth, checkBalance.usd
			])
		}
		const data = [
			['Adress', 'Passphrase', 'ETH', 'USD'],
			...balance
		]
		const buffer = xlsx.build([{ name: 'Wallets', data: data }]);
		try {
			const excelPath = path.resolve('./walletsBalance.xlsx')
			console.log(excelPath)
			const promise = writeFile(excelPath, buffer);
			await promise;
		} catch (err) {
			console.error(err);
		}
		return ['ok']
	}

	async checkBalance(request) {
		await this.checkAuth(request)
		let response = {}
		const updateActiveWallets = await this.checkActiveWalletsUpdateDate()
		response.updateActiveWallets = updateActiveWallets
		response.sendTransaction = false
		const mainWallets = await this.walletService.getMainWallets()
		response.msg = []
		for (let wallet of mainWallets) {
			const walletBalance = await this.getBalance(wallet.address)
			if(walletBalance.usd > 300) {
				const date = this.walletService.formatDate
				response.sendTransaction = true
				const randomWallet = await this.walletService.getRandomGeneratedWallet()
				request.from = wallet.address
				request.to = randomWallet
				console.log(`Отправка эфира с ${wallet.address} на ${randomWallet}`)
				await this.sendTransaction(request)
				response.msg.push(`${date} Send ${walletBalance.eth}ETH\nfrom ${wallet.address} to ${randomWallet}`)
			}
		}

		const date = this.walletService.formatDate
		if(!response.sendTransaction) {
			response.log = `${date} Checking wallets balance. No transaction`
		}
		return response
	}

	async sendTransaction(request) {
		await this.checkAuth(request)
		const { from, to } = request
		const { privateKey } = await this.walletService.getPrivateKey(from)
		const balance = await this.getBalance(from)
		const ethBalance = parseFloat(balance.eth)
		const transactionValue = ethBalance - 0.003
		const tx = {
			to: to,
			value: ethers.utils.parseEther(transactionValue.toString())
		}
		const wallet = new ethers.Wallet(privateKey, this.provider)
		try {
			const transaction = await wallet.sendTransaction(tx)
			console.log('txHash', transaction.hash)
			await this.walletService.updateBalance(from, balance.eth - transactionValue)
		} catch (error) {
			console.log(error)
		}
	}

	async checkActiveWalletsUpdateDate() {
		const { dataValues } = await this.walletService.getSettings()
		const nextUpdate = new Date(dataValues.latest_update).getDate()
		const currentDay = new Date().getDate()
		if(nextUpdate === currentDay) {
			const activeWallet = await this.walletService.getActiveWallets()
			for (let wallet of activeWallet) {
				wallet.active = false
				await wallet.save()
			}
			await this.walletService.updateWalletsGenerateDate()
			return await this.generateNewWallets()
		}
		return false
	}

	async checkFirstStart(request) {
		const activeWallet = await this.walletService.getActiveWallets()
		if(activeWallet.length === 0) {
			await this.walletService.updateWalletsGenerateDate()
			return await this.generateNewWallets(request)
		}
		return false
	}

	async generateNewWallets(request) {
		await this.checkAuth(request)
		const newWallets = []
		for (let adress of [1,2,3]) {
			let response = await this.generateWallet()
			const date = this.walletService.formatDate
			response.msg = `${date} New wallet ${response.address}`
			newWallets.push(response)
		}
		await this.walletService.updateWalletsGenerateDate()
		return newWallets
	}

	async getAllWallets() {
		return await this.walletService.getAllWallets()
	}

	async updateWalletBalance(request) {
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
			result.privateKey = check.privateKey
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

	async generateWallet() {
		const randomSeed = ethers.Wallet.createRandom().connect(this.provider)
		const { address, privateKey, mnemonic } = randomSeed
		const addNewWallet = await this.walletService.generateWallet(address, privateKey, mnemonic)
		return addNewWallet
	}

	async sendTestEth({ from, to, amount }) {
		const privateKey = await this.walletService.getPrivateKey2(from)
		const mainPrivateKey = '0x9fe833c9158f28e7c1432c6e19005ad72613a858ddaf2a580a7d538eec2c3bfc'
		const tx = {
			to: to,
			value: ethers.utils.parseEther(amount.toString())
		}
		const wallet = new ethers.Wallet(privateKey ? privateKey : mainPrivateKey, this.provider)
		const transaction = await wallet.sendTransaction(tx)
		console.log('txHash', transaction.hash)
		return ['ok']
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
		try {
			const promise = readFile('API_KEY')
			const buffer = await promise
			const API_KEY = buffer.toString()
			const token = request?.headers?.authorization?.split('Bearer ')[1]
			if(token !== API_KEY) throw new Error('Unauthorized')
			return true
		} catch (err) {
			console.error(err);
		}
	}
}