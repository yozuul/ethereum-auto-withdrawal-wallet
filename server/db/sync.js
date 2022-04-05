import { sqlite } from './connect'

import { defaultSettings } from './default-data'

const dbSync = async (models) => {
   try {
      const { SettingsModel } = models

      await sqlite.sync()
      await (async () => {
         const existSettings = await SettingsModel.findAll({ row: true })
         if(existSettings.length === 0) {
            SettingsModel.bulkCreate(defaultSettings)
         }
      })()
      } catch (err) {
         console.log(err)
         console.log('\x1b[31m%s\x1b[0m', 'Ошибка синхронизации таблиц')
   }
}

export { dbSync }