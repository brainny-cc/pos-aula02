const { Model, DataTypes } = require('sequelize')
const Sequelize = require('../database')
const Writer = require('./writer')

class Book extends Model {
    static associate() {
        Writer.hasMany(Book)
        Book.belongsTo(Writer)
    }
}

Book.init({
    title: DataTypes.STRING,
    ISBN: DataTypes.INTEGER,
    publicationDate: DataTypes.STRING,
    genre: DataTypes.STRING
}, { sequelize: Sequelize, modelName: 'book' })

Book.associate()

module.exports = Book