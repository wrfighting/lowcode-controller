const { Sequelize } = require('sequelize')
const config = require('../config')

const { dataBase, account, pwd, options } = config.mysql_options

const sq = new Sequelize(dataBase, account, pwd, options)

module.exports = sq
