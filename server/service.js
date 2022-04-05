import { WalletModel, SettingsModel } from './models'

export class WalletService {

	async generateWallet(address, privateKey, { phrase, path, locale }) {
		try {
			await WalletModel.create({
				address: address,
				phrase: phrase,
				path: path,
				locale: locale,
				addedMethod: 'random',
				balance: 0.00
			})
			const successMsg = `Кошелёк ${address} учпешно создан`
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

	async manualAddWallet({ adress, privateKey }, phrase, balance) {
		try {
			const isExist = await WalletModel.findOne({ where: {address: adress}})
			const existMsg = `Кошелёк ${adress} уже существует. Баланс ${balance} ETH`
			const successMsg = `Кошелёк ${adress} успешно добавлен. Баланс ${balance} ETH`
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
				balance: balance,
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

	async updateBalance(address, balance) {
		const wallet = await WalletModel.findOne({ where: { address: address } })
		wallet.balance = balance
		wallet.save
		return wallet.dataValues
	}

	async getPrivateKey(address) {
		const { dataValues } = await WalletModel.findOne({ where: { address: address } })
		return dataValues
	}
}