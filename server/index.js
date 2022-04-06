import {} from 'dotenv/config'
import Fastify from 'fastify'
import cron from 'node-cron'

import { WalletController } from './controller'

const wallet = new WalletController('ropsten') // homestead

const fastify = Fastify()
fastify.register(import('fastify-cors'), {})

fastify.get('/getAllWallets', async (request, reply) => {
	const allWallets = await wallet.getAllWallets(request)
	return allWallets
})
fastify.post('/manualAddWallet', async (request, reply) => {
	const addedWallet = await wallet.manualAddWallet(request)
	return addedWallet
})
fastify.get('/generateWallet', async (request, reply) => {
	const generatedWallet = await wallet.generateWallet(request)
	return generatedWallet
})
fastify.post('/sendTransaction', async (request, reply) => {
	const sended = await wallet.sendTransaction(request)
	return sended
})
fastify.post('/updateWalletBalance', async (request, reply) => {
	const sended = await wallet.updateWalletBalance(request)
	return sended
})
fastify.get('/checkFirstStart', async (request, reply) => {
	const sended = await wallet.checkFirstStart(request)
	return sended
})
fastify.get('/checkBalance', async (request, reply) => {
	const balance = await wallet.checkBalance(request)
	return ['balance']
})


const PORT = process.env.SERVER_PORT

// Run the server
const start = async () => {
	try {
		const address = await fastify.listen(PORT)
		console.log('\x1b[36m%s\x1b[0m', `Сервер запущен: ${address}`)
	} catch (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}

start()

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