const { readFile } = require('fs/promises')

class StaticListeners {
	closeNewWalletPopup() {
		const btn1 = query('#closePopupBtn.closeAddWalletProceeBtn')
		const btn2 = query('#closePopupBtn.newWallet')
		btn1.onclick = (() => hidePopup('#requestProcessPopup'))
		btn2.onclick = (() => hidePopup('#addWalletPopup'))
	}
	addNewWalletPopup() {
		const btn = query('#addNewWalletBtn')
		btn.onclick = (() => showPopup('#addWalletPopup'))
	}
	async addNewWalletSubmit() {
		const btn = query('#addNewWalletSubmitBtn')
		const input = query('#addWalletInput')
		const spinner = query('#addWalletPopup .loader')
		input.oninput = () => input.classList.remove('error')
		btn.onclick = (async () => {
			const passPhrase = input.value
			if(!passPhrase) {
				input.classList.add('error')
				return
			}
			btn.classList.add('hide')
			spinner.classList.remove('hide')
			const data = await fetchData('manualAddWallet', 'POST', { passPhrase: passPhrase })
			const toggleSpinner = () => {
				btn.classList.remove('hide')
				spinner.classList.add('hide')
				console.log(spinner)
			}
			setTimeout(toggleSpinner, 1000)
			hidePopup('#addWalletPopup')
			if(data.error) {
				showToast(data.msg, 'error', data.adress, data.ethBalance)
				return
			}
			showToast(data.msg, '', data.adress, data.ethBalance)
			console.log(data)
			pushWallet(data)
			pushLog(data.log)
			input.value = ''
			query('#startAppBtn').classList.remove('blocked')
		})
	}
	startApp() {
		const btn = query('#startAppBtn')
		btn.onclick = (() => {
			if(btn.classList.contains('blocked')) {
				btn.classList.add('noclick')
				showToast('You have not added any wallet yet. Please add wallet...', 'error')
				setTimeout(btn.classList.remove('noclick'), 3000)
				return
			}
			if(btn.classList.contains('stopState')) {
				console.log(window.timerID)
				btn.classList.remove('stopState')
				btn.innerText = 'Start'
				setTimeout(() => { clearInterval(window.timerID); console.log('stop'); }, 10);
			} else {
				btn.classList.add('stopState')
				btn.innerText = 'Stop'
				console.log('start')
				window.timerID = setInterval(() => checkBalance(), 30000);
			}
		})
	}
	async updateAllWalletsBalance() {
		const rotateBtn = query('#refreshBalanceSpinner button')
		rotateBtn.onclick = (async () => {
			await updateAllWalletsBalance()
		})
		rotateBtn.classList.remove('rotate')
	}
}

const listen = new StaticListeners()
listen.updateAllWalletsBalance()
listen.closeNewWalletPopup()
listen.addNewWalletSubmit()
listen.addNewWalletPopup()
listen.startApp()

// START
async function startApp() {
	await getApiKey()
	const checkFirstStart = await fetchData('checkFirstStart', 'GET')
	if(checkFirstStart) {
		checkFirstStart.map((wallet) => pushLog(wallet.msg))
		pushLog(`${formatDate()} Next wallets will be added after 7 days`)
		return
	}
	checkBalance()
}

startApp()

async function updateAllWalletsBalance() {
	const rotateBtn = query('#refreshBalanceSpinner button')
	rotateBtn.classList.add('rotate')
	const getAllWallets = queryAll('.walletTableRow')
	if(getAllWallets.length > 0) {
		for (let tableRow of getAllWallets) {
			const idAdress = tableRow.getAttribute('id')
			const adress = idAdress.split('ETH_')[1]
			await updateWalletBalance(adress)
		}
		rotateBtn.classList.remove('rotate')
	}
}

async function checkBalance() {
	const data = await fetchData('checkBalance', 'GET')
	if(data.sendTransaction) {
		for (let adress of data.msg) {
			pushLog(adress)
		}
	} else {
		pushLog(data.log)
	}
	await updateAllWalletsBalance()
}

async function getExistWallet() {
	const data = await fetchData('getAllWallets', 'GET')
	setTimeout(query('#App').classList.add('show'), 300)
	if(data.errorType === 'noWallets') {
		query('#startAppBtn').classList.add('blocked')
		return
	} else {
		query('#startAppBtn').classList.remove('blocked')
	}
	if(!data.error) {
		data.wallets.map((wallet) => {
			const formatData = {
				adress: wallet.address,
				ethBalance: wallet.balance > 0 ? sliceETH(wallet.balance) : '0.000',
				usdBalance: wallet.balanceUsd,
			}
			query('#startAppBtn').classList.remove()
			pushWallet(formatData)
		})
	}
}

getExistWallet()

async function updateWalletBalance(adress) {
	const rotateBtn = query('#refreshBalanceSpinner')
	rotateBtn.classList.add('rotate')
	const ethBalanceCell = query(`#ETH_${adress} .wallet_ETH_balance`)
	const usdBalanceCell = query(`#ETH_${adress} .wallet_USD_balance`)
	ethBalanceCell.innerText = '—'
	usdBalanceCell.innerText = '—'
	const { eth, usd } = await fetchData(`updateWalletBalance`, 'POST', { adress: adress })
	ethBalanceCell.innerText = sliceETH(eth)
	usdBalanceCell.innerText = usd
	rotateBtn.classList.remove('rotate')
}

async function getApiKey() {
	try {
		const promise = readFile('API_KEY')
		const buffer = await promise
		window.API_KEY = buffer.toString()
	} catch (err) {
		console.error(err);
	}
}

async function generateExcel() {
	showPopup('#generateExcelPopup')
	try {
		await fetchData('generateExcel', 'GET')
	} catch (error) {
		console.log(error)
	}
	hidePopup('#generateExcelPopup')
}
async function addNewWallet() {
	const passPhrase = 'radar drama critic chicken barely sock valve glad enhance crazy secret blur'
	query('#addWalletSpinnerPhrase').innerText = passPhrase
	hidePopup('#addWalletPopup')
	showPopup('#requestProcessPopup')
	const data = await fetchData('manualAddWallet', 'POST', { phrase: passPhrase })
	hidePopup('#requestProcessPopup')
	if(!data.msg) addNewWallet()
	pushLog(data.msg)
	if(data.error) pushWallet(data)
}

// COMMON
async function fetchData(enpoint, method, data) {
	const response = await fetch(`http://localhost:5000/${enpoint}`, {
		method: method,
		headers: {
			Authorization: `Bearer ${window.API_KEY}`,
			'Content-Type': 'application/json;charset=utf-8'
		 },
		 body: JSON.stringify(data)
	})
	return await response.json()
}

function pushWallet({ adress, ethBalance, usdBalance }) {
	const template = walletRowTemplate(adress, ethBalance, usdBalance)
	query('#walletListTable tbody').insertAdjacentHTML('afterbegin', template)
}

function pushLog(text) {
	const row = `<div>${text}</div>`
	const logWindow = query('#logWindow')
	logWindow.insertAdjacentHTML('afterbegin', row);
}

function showPopup(element) {
	const block = query(element)
	block.setAttribute('style', '')
	const show = () => block.classList.remove('hide')
	setTimeout(show, 300)
}

function showToast(title, type, subMsg, balance) {
	const block = query('#toast')
	query('#toast h3').innerText = title
	if(subMsg) {
		let subMsgTag = `<h5>${subMsg}</h5>`
		balance ? subMsgTag = `${subMsgTag}\n<h3>Balance: ${balance} ETH</h3>` : ''
		query('#toast h3').insertAdjacentHTML('afterend', subMsgTag )
	}
	type === 'error' ? block.classList.add('errorToast') : block.classList.remove('errorToast')
	block.setAttribute('style', '')
	const show = () => block.classList.remove('hide')
	const hide = () => {
		block.classList.add('hide')
		setTimeout(block.setAttribute('style', 'display: none'), 300)
		subMsg ? query('#toast h5 + h3').remove() : ''
		subMsg ? query('#toast h5').remove() : ''
	}
	setTimeout(show, 300)
	setTimeout(hide, 2500)
}

function hidePopup(element) {
	const block = query(element)
	block.classList.add('hide')
	const dn = () => block.setAttribute('style', 'display: none')
	setTimeout(dn, 300)
}

function formatDate() {
	const today = new Date()
	const days = today.toLocaleDateString('en-EN')
	const hours = `${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')}:${today.getSeconds()}`
	return `<span>[${days}] [${hours}]</span>`
}

function sliceETH(float) {
	return float.toString().slice(0, 5)
}

function copyToClipboard(adress) {
	navigator.clipboard.writeText(adress).then(() => {
		console.log('скопировано')
	 }, () => {
		console.log('не скопировано')
	 })
}

function walletRowTemplate(adress, ethBalance, usdBalance) {
	return `<tr id="ETH_${adress}" class="walletTableRow">
		<td class="wallet_num"></td>
		<td class="wallet_adress">
			<span>${adress}</span>
			<button onclick="copyToClipboard('${adress}')" title="Скопировать адрес">
				<img src="public/icons/copy.png">
			</button>
		</td>
		<td class="wallet_ETH_balance">${ethBalance}</td>
		<td class="wallet_USD_balance">${usdBalance}</td>
		<td class="wallet_actions">
			<button onclick="updateWalletBalance('${adress}')"><img src="public/icons/magnifier.png"></button>
		</td>
	</tr>`
}
function query(el) {
	return document.querySelector(el)
}
function queryAll(el) {
	return document.querySelectorAll(el)
}

// async function sendTestEth() {
// 	const from = query('#sendFromTestEthInput').value
// 	const to = query('#sendToTestEthInput').value
// 	const amount = query('#sendToTestEthAmountInput').value
// 	await fetchData('sendTestEth', 'POST', {
// 		from: from, to: to, amount: amount
// 	})
// 	query('#sendToTestEthInput').value = ''
// 	// query('#sendToTestEthAmountInput').value = ''
// }