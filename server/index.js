import {} from 'dotenv/config'
import Fastify from 'fastify'

import { WalletController } from './controller'

const wallet = new WalletController('homestead') // ropsten

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
	return balance
})
fastify.get('/generateExcel', async (request, reply) => {
	try {
		const data = await wallet.generateExcel(request)
		return data
	} catch (error) {
		console.log(error)
	}
})
fastify.post('/sendTestEth', async (request, reply) => {
	try {
		await wallet.sendTestEth(request.body)
	} catch (error) {
		console.log(error)
	}
	return ['ok']
})


// Run the server
export const start = async (PORT) => {
	try {
		const address = await fastify.listen(PORT)
		console.log('\x1b[36m%s\x1b[0m', `Server: ${address}`)
		PORT = address.split('http://127.0.0.1:')[1]
	} catch (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}

// start()

// govern rhythm sugar soon address client young silent note label poverty number
// bind ghost slim actual stove warm vanish make enact code census scatter
// wrestle grunt dust fury advance rose pretty pupil cargo later lava ability

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