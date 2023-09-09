const _ = require('lodash')
const utils = require('./common')

module.exports = {
    findByPage: async (
        model,
        { pageQuery = {}, extraOptions = {}, filter, ctx = null }
    ) => {
        const { size = 10, page = 0, query = {} } = pageQuery
        const options = {
            limit: Number(size),
            offset: Number(size) * Number(page),
            where: query,
            raw: true,
        }
        const data = await model.findAndCountAll(
            Object.assign(options, extraOptions)
        )
        const { rows, count } = data
        const result = {
            list: rows,
            total: count,
        }
        if (rows && rows.length > 0 && filter) {
            result.list = result.list.map(filter)
        }
        if (!ctx) {
            return result
        } else {
            return (ctx.body = utils.resSuccess(result))
        }
    },
    findByList: async (
        model,
        { query = {}, extraOptions = {}, transaction, filter, ctx = null }
    ) => {
        const options = Object.assign(
            {
                where: query,
                raw: true,
            },
            extraOptions
        )
        if (transaction) {
            options.transaction = transaction
            return model.findAll(options)
        }
        let results = await model.findAll(options)
        if (results && results.length > 0 && filter) {
            results = results.map(filter)
        }
        if (!ctx) {
            return results
        } else {
            return (ctx.body = utils.resSuccess(results))
        }
    },
    create: async (
        model,
        {
            saveObj,
            ctx = null,
            transaction,
            extraOptions = {},
            enableBatch = false,
        }
    ) => {
        let result = null
        let options = extraOptions
        if (enableBatch && _.isArray(saveObj)) {
            if (transaction) {
                options.transaction = transaction
                return model.bulkCreate(saveObj, options)
            } else {
                result = (await model.bulkCreate(saveObj, options)).map(row => row.get({
                    plain: true,
                }))
            }
        } else {
            if (transaction) {
                options.transaction = transaction
                return model.create(saveObj, options)
            } else {
                result = (await model.create(saveObj, options)).get({
                    plain: true,
                })
            }
        }
        if (!ctx) {
            return result
        } else {
            return (ctx.body = utils.resSuccess(result))
        }
    },
    getSingle: async (
        model,
        { query, ctx = null, transaction, extraOptions = {} }
    ) => {
        let result = null
        let options = Object.assign(
            {
                raw: true,
            },
            extraOptions
        )
        transaction && (options.transaction = transaction)
        if (typeof query === 'string') {
            if (transaction) {
                return model.findByPk(query, options)
            } else {
                result = await model.findByPk(query, options)
            }
        } else {
            options.where = query
            if (transaction) {
                return model.findOne(options)
            } else {
                result = await model.findOne(options)
            }
        }
        if (!ctx) {
            return result
        } else {
            return (ctx.body = utils.resSuccess(result))
        }
    },
    update: async (
        model,
        { query, updateObj = {}, ctx = null, transaction, extraOptions = {} }
    ) => {
        let options = Object.assign(
            {
                where: query,
            },
            extraOptions
        )
        if (transaction) {
            options.transaction = transaction
            return model.update(updateObj, options)
        } else {
            await model.update(updateObj, options)
        }
        if (!ctx) {
            return true
        } else {
            return (ctx.body = utils.resSuccess())
        }
    },
    delete: async (
        model,
        { query, ctx = null, transaction, extraOptions = {}, updateObj }
    ) => {
        let update = updateObj || { delete_flag: 1 }
        let options = Object.assign(
            {
                where: query,
            },
            extraOptions
        )
        if (transaction) {
            options.transaction = transaction
            return model.update(update, options)
        } else {
            await model.update(update, options)
        }
        if (!ctx) {
            return true
        } else {
            return (ctx.body = utils.resSuccess())
        }
    },
    physicDelete: async (
        model,
        { query, ctx = null, transaction, extraOptions = {} }
    ) => {
        let options = Object.assign(
            {
                where: query,
            },
            extraOptions
        )
        if (transaction) {
            options.transaction = transaction
            return model.destroy(options)
        } else {
            await model.destroy(options)
        }
        if (!ctx) {
            return true
        } else {
            return (ctx.body = utils.resSuccess())
        }
    },
    relateQueryMN: async (
        relateModel,
        relateQuery,
        filterFnc,
        model,
        modelFields,
        extraModelOptions = {},
        extraRelateOptions = {}
    ) => {
        let relates = await this.findByList(relateModel, {
            query: relateQuery,
            extraOptions: extraRelateOptions,
        })
        let nextQuery = relates.map(filterFnc)
        let query = {
            where: {
                [modelFields]: { $in: nextQuery },
            },
        }
        const { where, attributes, other } = extraModelOptions
        where && (query.where = Object.assign(query.where, where))
        attributes && (query.attributes = attributes)
        let results = await this.findByList(model, {
            query,
            extraOptions: other,
        })
        return { results, relates }
    },
}
