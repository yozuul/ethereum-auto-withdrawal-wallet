// const { ipcRenderer } = require('electron')

const delayCheck = 1000

async function startApp() {
	const checkFirstStart = await fetchData('checkFirstStart', 'GET')
	if(checkFirstStart) checkFirstStart.map((wallet) => pushLog(wallet.msg))
	checkBalance()
	// setInterval(() => checkBalance(), 1000);
}

startApp()

const addDays = (days) => {
	const date = new Date()
	date.setDate(date.getDate() + days)
	return date
}

console.log(new Date())

async function checkBalance() {
	const data = await fetchData('checkBalance', "GET")
	console.log(data)
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
				ethBalance: sliceETH(wallet.balance),
				usdBalance: wallet.balanceUsd,
			}
			query('#startAppBtn').classList.remove()
			pushWallet(formatData)
		})
		listen.updateAllWalletsBalance()
	}
}

getExistWallet()

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
		})
	}
	startApp() {
		const btn = query('#startAppBtn')
		btn.onclick = (() => {
			if(btn.classList.contains('blocked')) {
				btn.classList.add('noclick')
				showToast('You have not added any wallet yet. Please add wallet...', 'error')
				setTimeout(btn.classList.remove('noclick'), 3000)
			}
		})
	}
	async updateAllWalletsBalance() {
		const rotateBtn = query('#refreshBalanceSpinner button')
		rotateBtn.onclick = (async () => {
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
		})
	}
}

var listen = new StaticListeners()
listen.closeNewWalletPopup()
listen.addNewWalletPopup()
listen.addNewWalletSubmit()
listen.startApp()

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

// COMMON
async function fetchData(enpoint, method, data) {
	const response = await fetch(`http://localhost:5000/${enpoint}`, {
		method: method,
		headers: {
			Authorization: `Bearer SDASD5454ASD54ASDFAFS789ASDF45`,
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
function sliceETH(float) {
	return float.toString().slice(0, 5)
}
function walletRowTemplate(adress, ethBalance, usdBalance) {
	return `<tr id="ETH_${adress}" class="walletTableRow">
		<td class="wallet_num"></td>
		<td class="wallet_adress">${adress}</td>
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
