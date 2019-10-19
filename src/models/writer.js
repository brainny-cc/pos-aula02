const { Model, DataTypes } = require('sequelize')
const Sequelize = require('../database')

class Writer extends Model { }

Writer.init({
    firstname: DataTypes.STRING,
    lastname: DataTypes.STRING,
    birthday: DataTypes.STRING,
    gender: DataTypes.STRING,
    phone: DataTypes.STRING
}, { sequelize: Sequelize, modelName: 'writer' })

module.exports = Writer