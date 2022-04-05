import { sqlite, DataTypes } from './db/connect'
import { dbSync } from './db/sync'

const { STRING, DATE, DECIMAL } = DataTypes

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
})

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
    addedMethod: STRING,
    balance: DECIMAL
}, {
    tableName: 'wallets',
})

dbSync({
    SettingsModel: SettingsModel
})


export { SettingsModel, WalletModel }