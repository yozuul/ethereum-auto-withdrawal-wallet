import { Sequelize, DataTypes } from 'sequelize';
// SQLite
export const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: './db/.ethers.sqlite',
    logging: false
});
(async () => {
    try {
        await sqlite.authenticate();
        console.log(('\nПодключение к SQLite установлено'));
    } catch (err) {
        console.log(err)
        console.error(('Ошибка подключения SQLite'));
    }
})

export const Op = Sequelize.Op
export { DataTypes }