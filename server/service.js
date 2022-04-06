import { WalletModel, SettingsModel } from './models'

export class WalletService {

	async getSettings() {
		return SettingsModel.findOne({})
	}

	async getAllWallets() {
		try {
			const wallets = await WalletModel.findAll({
				where: {
					addedMethod: 'manual'
				}
			})
			if(wallets.length === 0) {
				return {
					error: true,
					errorType: 'noWallets',
					msg: `You have not added any wallet yet. Please add wallet...`,
				}
			}
			const successMsgWallets = `Кошельки получены`
			return {
				error: false,
				msg: successMsgWallets,
				wallets: wallets,
			}
		} catch (error) {
			const errorMsg = `Ошибка получения кошельков ${address}`
			console.log(error, errorMsg)
			return {
				error: true,
				msg: errorMsg
			}
		}
	}

	async removeActiveWallets() {
		const checkActiveWallets = await WalletModel.findAll({
			where: { active: true }
		})
		if(checkActiveWallets.length > 0) {
			checkActiveWallets.map(async (wallet) => {
				wallet.active = false
				await wallet.save()
			})
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
			})
			const successMsg = `Кошелёк ${address} успешно создан`
			console.log(successMsg)
			return {
				error: false,
				msg: successMsg,
				address: address,
				passphrase: privateKey
			}
		} catch (error) {
			const errorMsg = `Ошибка создания кошелька ${address}`
			console.log(error, errorMsg)
			return {
				error: true,
				msg: errorMsg
			}
		}
	}

	async manualAddWallet({ adress, privateKey }, phrase, ethBalance, usdBalance) {
		try {
			const isExist = await WalletModel.findOne({ where: {address: adress}})
			const existMsg = `Wallet already exist: `
			const successMsg = `Wallet successfully added:`
			if(isExist) {
				console.log(existMsg)
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
			})
			console.log(successMsg)
			return {
				error: false,
				msg: successMsg,
				address: adress,
				phrase: phrase
			}
		} catch (error) {
			const errorMsg = `Ошибка добавления кошелька ${adress}`
			console.log(error, errorMsg)
			return {
				error: true,
				msg: errorMsg
			}
		}
	}

	async updateBalance(address, balance, usd) {
		const wallet = await WalletModel.findOne({ where: { address: address } })
		wallet.balance = parseFloat(balance)
		usd ? wallet.balanceUsd = usd : ''
		await wallet.save()
		return wallet.dataValues
	}

	async getPrivateKey(address) {
		const { dataValues } = await WalletModel.findOne({ where: { address: address } })
		return dataValues
	}

	async getActiveWallets() {
		const activeWallet = await WalletModel.findAll({
			where: { active: true }
		})
		return activeWallet
	}

	get formatDate() {
		const today = new Date()
		const days = today.toLocaleDateString('en-EN')
		const hours = `${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')}:${today.getSeconds()}`
		return `<span>[${days}] [${hours}]</span>`
	}
}