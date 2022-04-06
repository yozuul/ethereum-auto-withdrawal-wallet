import { postgres } from './db-connect'
import { darkGray, red } from 'ansicolor'

import { defaultUser, defaultSettings } from './default-db-data'

const pgSync = async (models) => {
   try {
      const { UserModel, SettingsModel } = models

      await postgres.sync()
      await (async () => {
         const existUser = await UserModel.findAll({ row: true })
         if(existUser.length === 0) {
            UserModel.bulkCreate(defaultUser)
         }
         const existSettings = await SettingsModel.findAll({ row: true })
         if(existSettings.length === 0) {
            SettingsModel.bulkCreate(defaultSettings)
         }
      })()
      } catch (err) {
         console.log(err)
         console.log(('Ошибка синхронизации таблиц').red)
   }
}

export default pgSync