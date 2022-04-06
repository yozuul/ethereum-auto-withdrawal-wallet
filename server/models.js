import { sqlite, DataTypes } from '../db/connect'
import { dbSync } from '../db/sync'

const { STRING, DATE, DECIMAL, BOOLEAN } = DataTypes

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
    addedMethod: {
        type: STRING
    },
    balance: {
        type: DECIMAL
    },
    balanceUsd: {
        type: DECIMAL
    },
    active: {
        type: BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'wallets',
})

dbSync({
    SettingsModel: SettingsModel
})


export { SettingsModel, WalletModel }