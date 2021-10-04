const { DataTypes } = require('sequelize')
const sq = require('../db/mysql')

const Cats = sq.define(
    'cats',
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        cat_name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            defaultValue: '',
        },
        creator: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
        },
        upator: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
        },
        age: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        job: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
        },
        birthday: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        delete_flag: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
    },
    {
        comment: 'cat table',
        underscored: true,
        indexes: [
            {
                name: 'idx_name',
                method: 'BTREE',
                fields: ['name'],
            },
        ],
        version: true,
    }
)

Cats.sync()

module.exports = Cats
