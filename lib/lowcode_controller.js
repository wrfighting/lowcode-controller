const {
    curdHelper,
    smartFuncExecute,
    resFail,
    resSuccess,
    setCustomResField,
    validator,
    isAsyncOrPromise,
    errCatch,
    timeQuery,
} = require('./utils')
const _ = require('lodash')
const { Sequelize } = require('sequelize')
const { fn, col } = Sequelize
const Op = Sequelize.Op
let sq
let usernameField

class LowCodeController {
    constructor(model, config = {}, db, extraOptions = {}) {
        if (!sq) {
            throw new Error(
                'no mysql db instance, you should invoke setGlobalDBPath first'
            )
        }
        this.model = model
        this.config = config
        this.sq = db || sq
        const { creatorField, updatorField, defaultQuery, updateDelete } =
            extraOptions
        creatorField && (this.creatorField = creatorField)
        updatorField && (this.updatorField = updatorField)
        this.defaultQuery = defaultQuery || { delete_flag: 1 }
        this.updateDelete = updateDelete || { delete_flag: 0 }
        this.pageQuery = this.pageQuery.bind(this)
        this.getList = this.getList.bind(this)
        this.getSingle = this.getSingle.bind(this)
        this.create = this.create.bind(this)
        this.update = this.update.bind(this)
        this.delete = this.delete.bind(this)
    }

    static setCustomResField(codeFieldKey = 'errno', msgFieldKey = 'errmsg', dataFieldKey = 'data') {
        setCustomResField(codeFieldKey, msgFieldKey, dataFieldKey)
    }

    static setGlobalDBPath(dbPath) {
        sq = require(dbPath)
    }

    static setUserNameField(field) {
        usernameField = field
    }

    static getQuery(config, field, sourceBody, where = {}, ctx) {
        if (config[field]) {
            const { query } = config[field]
            if (query) {
                for (let k in query) {
                    let queryField = query[k]
                    if (k === '$time') {
                        let queryTime = queryField
                        for (let k in queryTime) {
                            let start = sourceBody[queryTime[k][0]]
                            let end =
                                sourceBody[queryTime[k][1]](start || end) &&
                                (where[k] = {})
                            start && (where[k][Op.gte] = start)
                            end && (where[k][Op.lte] = end)
                        }
                    } else if (k === '$or') {
                        queryField = query[k]
                        where[Op.or] = []
                        for (let f in queryField) {
                            LowCodeController.setFieldQuery(
                                queryField[f],
                                f,
                                where,
                                sourceBody,
                                k,
                                ctx
                            )
                        }
                    } else {
                        LowCodeController.setFieldQuery(
                            queryField,
                            k,
                            where,
                            sourceBody,
                            null,
                            ctx
                        )
                    }
                }
            }
        }
        return where
    }

    static setFieldQuery(
        field,
        modelField,
        where,
        sourceBody,
        parentFiled,
        ctx
    ) {
        if (!field) {
            return where
        }
        let { type, value } = field
        switch (type) {
            case 'constant': {
                let { ctxField, operator } = field
                ctxField && (value = _.get(ctx, ctxField))
                if (operator === '$in') {
                    if (parentFiled === '$or') {
                        where.push({ [modelField]: { [Op.in]: value } })
                    } else {
                        where[modelField] = { [Op.in]: value }
                    }
                } else if (operator === '$ne') {
                    if (parentFiled === '$or') {
                        where.push({ [modelField]: { [Op.ne]: value } })
                    } else {
                        where[modelField] = { [Op.ne]: value }
                    }
                } else if (operator === '$time') {
                    let query = timeQuery(value)
                    if (parentFiled === '$or') {
                        where.push({ [modelField]: query })
                    } else {
                        where[modelField] = query
                    }
                } else {
                    LowCodeController._queryFieldDeal(
                        field,
                        where,
                        modelField,
                        value,
                        parentFiled
                    )
                }
                break
            }

            case 'varArray': {
                let v = sourceBody[value]
                if (v) {
                    if (parentFiled === '$or') {
                        where.push({
                            [modelField]: { [Op.in]: v },
                        })
                    } else {
                        where[modelField] = { [Op.in]: v }
                    }
                }
                break
            }

            case 'varTime': {
                let query = timeQuery(value, sourceBody)
                if (query) {
                    if (parentFiled === '$or') {
                        where.push({
                            [modelField]: query,
                        })
                    } else {
                        where[modelField] = query
                    }
                }
                break
            }

            //var
            default: {
                let v = sourceBody[value]
                if (v) {
                    LowCodeController._queryFieldDeal(
                        field,
                        where,
                        modelField,
                        v,
                        parentFiled,
                    )
                } else {
                    if (field.require) {
                        throw new Error(`${value}必填`)
                    }
                }
                break
            }
        }
    }

    static _queryFieldDeal(field, where, modelField, value, parentFiled) {
        const { like, json, parseNumber, time } = field
        if (parentFiled === '$or') {
            if (like) {
                where.push({ [modelField]: { [Op.like]: `%${value}%` } })
            } else if (parseNumber) {
                where.push({ [modelField]: Number(value) })
            } else if (json) {
                where.push(fn('JSON_CONTAINS', col(modelField), `\"${value}\"`))
            } else {
                where.push({ [modelField]: value })
            }
        } else {
            if (like) {
                where[modelField] = { [Op.like]: `%${value}%` }
            } else if (parseNumber) {
                where[modelField] = Number(value)
            } else if (json) {
                where[Op.and] = [
                    fn('JSON_CONTAINS', col(modelField), `\"${value}\"`),
                ]
            } else {
                where[modelField] = value
            }
        }
    }

    pickFiledFromConfig(path) {
        return path ? _.get(this.config, path) : null
    }

    validateHelp(source, rules = null) {
        if (rules) {
            if (_.isArray(source)) {
                for (let i = 0; i < source.length; i++) {
                    let validateResult = validator.validateJson(
                        source[i],
                        rules
                    )
                    if (!validateResult.success) {
                        return validateResult
                    }
                }
            } else {
                let validateResult = validator.validateJson(source, rules)
                if (!validateResult.success) {
                    return validateResult
                }
            }
        }
        return null
    }

    async pageQuery(ctx) {
        const beforeQueryHook = this.pickFiledFromConfig(
            'pageQuery.beforeQueryHook'
        )
        const afterQueryHook = this.pickFiledFromConfig(
            'pageQuery.afterQueryHook'
        )
        const extraOptions = this.pickFiledFromConfig('pageQuery.extraOptions')
        let filter = this.pickFiledFromConfig('pageQuery.filter')

        const { size, page } = ctx.query
        let where = LowCodeController.getQuery(
            this.config,
            'pageQuery',
            ctx.query,
            {},
            ctx
        )
        let query = {
            size,
            page,
            query: Object.assign(_.cloneDeep(this.defaultQuery), where),
        }

        if (beforeQueryHook) {
            const needReturn = await smartFuncExecute.call(
                this,
                beforeQueryHook,
                query,
                extraOptions,
                ctx,
            )
            if (needReturn) {
                return null
            }
        }

        if (afterQueryHook) {
            let sourceResults = await curdHelper.findByPage(this.model, {
                pageQuery: query,
                extraOptions,
                filter,
            })
            const results = await smartFuncExecute.call(
                this,
                afterQueryHook,
                sourceResults,
                query,
                extraOptions,
                ctx,
            )
            ctx.body = resSuccess(results || sourceResults)
        } else {
            await curdHelper.findByPage(this.model, {
                pageQuery: query,
                extraOptions,
                filter,
                ctx,
            })
        }
    }

    async create(ctx) {
        let { body } = ctx.request
        let validateResult = this.validateHelp(
            body,
            this.pickFiledFromConfig('create.validate')
        )
        if (validateResult && !validateResult.success) {
            return (ctx.body = resFail(1, validateResult.message))
        }

        let constantCreate = this.pickFiledFromConfig('create.constantCreate')
        let pickCreate = this.pickFiledFromConfig('create.pickCreate')
        const enableBatch = this.pickFiledFromConfig('create.enableBatch')
        const beforeInsertHook = this.pickFiledFromConfig(
            'create.beforeInsertHook'
        )
        const afterInsertHook = this.pickFiledFromConfig(
            'create.afterInsertHook'
        )
        const extraOptions = this.pickFiledFromConfig('create.extraOptions')

        let createItem = _.cloneDeep(body)

        if (usernameField) {
            this.creatorField &&
                (createItem[this.creatorField] = _.get(ctx, usernameField))
            this.updatorField &&
                (createItem[this.updatorField] = _.get(ctx, usernameField))
        }

        if (constantCreate) {
            createItem = Object.assign(createItem, constantCreate)
        }

        if (pickCreate) {
            for (let k in pickCreate) {
                createItem[k] = createItem[pickCreate[k]]
            }
        }

        if (beforeInsertHook) {
            const needReturn = await smartFuncExecute.call(
                this,
                beforeInsertHook,
                createItem,
                ctx,
            )
            if (needReturn) {
                return null
            }
        }

        let sourceResult = null
        if (afterInsertHook) {
            isAsyncOrPromise(afterInsertHook)
            await this.sq
                .transaction(t => {
                    return curdHelper
                        .create(this.model, {
                            saveObj: createItem,
                            transaction: t,
                            extraOptions,
                            enableBatch,
                        })
                        .then(insertItem => {
                            sourceResult = insertItem
                            return afterInsertHook.call(
                                this,
                                insertItem,
                                t,
                                ctx,
                            )
                        })
                })
                .then((result = null) => {
                    ctx.body = resSuccess(result || sourceResult)
                })
                .catch(errCatch(ctx))
        } else {
            await curdHelper.create(this.model, {
                saveObj: createItem,
                ctx,
                extraOptions,
                enableBatch,
            })
        }
    }

    async update(ctx) {
        const id = ctx.params.id
        const { body } = ctx.request
        let query = null
        let item = null
        let updateItem = _.cloneDeep(body)

        let queryConfig = this.pickFiledFromConfig('update.query')
        let validate = this.pickFiledFromConfig('update.validate')
        const itemBlock = this.pickFiledFromConfig('update.itemBlock')
        const pick = this.pickFiledFromConfig('update.pick')
        const beforeUpdateHook = this.pickFiledFromConfig(
            'update.beforeUpdateHook'
        )
        const afterUpdateHook = this.pickFiledFromConfig(
            'update.afterUpdateHook'
        )
        const extraOptions = this.pickFiledFromConfig('update.extraOptions')

        if (id) {
            query = Object.assign({ id }, this.defaultQuery)
        } else if (queryConfig) {
            query = LowCodeController.getQuery(
                this.config,
                'update',
                body,
                { ...this.defaultQuery },
                ctx,
            )
        }
        item = await curdHelper.getSingle(this.model, {
            query,
        })
        if (!item) {
            return (ctx.body = resFail(1, 'The item is not exists'))
        }
        if (!query) {
            return (ctx.body = resFail(
                1,
                'Updates without query are prohibited'
            ))
        }

        if (validate) {
            let validateResult = this.validateHelp(updateItem, validate)
            if (validateResult && !validateResult.success) {
                return (ctx.body = resFail(1, validateResult.message))
            }
        }

        if (item && itemBlock) {
            for (let k in itemBlock) {
                if (item[k] !== itemBlock[k]['value']) {
                    return (ctx.body = resFail(1, itemBlock[k]['message']))
                }
            }
        }

        if (pick && _.isArray(pick)) {
            updateItem = _.pick(updateItem, pick)
        }

        if (usernameField) {
            this.updatorField &&
                (updateItem[this.updatorField] = _.get(ctx, usernameField))
        }

        if (beforeUpdateHook) {
            const needReturn = await smartFuncExecute.call(
                this,
                beforeUpdateHook,
                updateItem,
                item,
                ctx,
            )
            if (needReturn) {
                return null
            }
        }

        if (afterUpdateHook) {
            isAsyncOrPromise(afterUpdateHook)
            await this.sq.transaction(t => {
                return curdHelper
                    .update(this.model, {
                        query,
                        transaction: t,
                        updateObj: updateItem,
                        extraOptions,
                    })
                    .then(raw => {
                        return afterUpdateHook.call(
                            this,
                            updateItem,
                            item,
                            raw,
                            t,
                            ctx,
                        )
                    })
                    .then(result => {
                        ctx.body = resSuccess(result)
                    })
                    .catch(errCatch(ctx))
            })
        } else {
            await curdHelper.update(this.model, {
                query,
                updateObj: updateItem,
                ctx,
                extraOptions,
            })
        }
    }

    async getSingle(ctx) {
        let id = ctx.params.id

        let queryConfig = this.pickFiledFromConfig('getSingle.query')
        const beforeQueryHook = this.pickFiledFromConfig(
            'getSingle.beforeQueryHook'
        )
        const afterQueryHook = this.pickFiledFromConfig(
            'getSingle.afterQueryHook'
        )
        const extraOptions = this.pickFiledFromConfig('getSingle.extraOptions')

        let query = {}
        id && (query.id = id)
        if (!id && queryConfig) {
            query = LowCodeController.getQuery(
                this.config,
                'getSingle',
                ctx.query,
                _.cloneDeep(this.defaultQuery),
                ctx
            )
        }
        if (beforeQueryHook) {
            const needReturn = await smartFuncExecute.call(
                this,
                beforeQueryHook,
                query,
                extraOptions,
                ctx,
            )
            if (needReturn) {
                return null
            }
        }
        if (afterQueryHook) {
            let sourceResult = await curdHelper.getSingle(this.model, {
                query,
                extraOptions,
            })
            let result = await smartFuncExecute.call(
                this,
                afterQueryHook,
                sourceResult,
                query,
                extraOptions,
                ctx,
            )
            ctx.body = resSuccess(result || sourceResult)
        } else {
            await curdHelper.getSingle(this.model, { query, ctx, extraOptions })
        }
    }

    async getList(ctx) {
        let query = LowCodeController.getQuery(
            this.config,
            'getList',
            ctx.query,
            _.cloneDeep(this.defaultQuery),
            ctx,
        )
        const beforeQueryHook = this.pickFiledFromConfig(
            'getList.beforeQueryHook'
        )
        const afterQueryHook = this.pickFiledFromConfig(
            'getList.afterQueryHook'
        )
        const extraOptions = this.pickFiledFromConfig('getList.extraOptions')
        let filter = this.pickFiledFromConfig('getList.filter')

        if (beforeQueryHook) {
            const needReturn = await smartFuncExecute.call(
                this,
                beforeQueryHook,
                query,
                extraOptions,
                ctx,
            )
            if (needReturn) {
                return null
            }
        }

        if (afterQueryHook) {
            let sourceResults = await curdHelper.findByList(this.model, {
                query,
                extraOptions,
                filter,
            })
            const results = await smartFuncExecute.call(
                this,
                afterQueryHook,
                sourceResults,
                query,
                extraOptions,
                ctx,
            )
            ctx.body = resSuccess(results || sourceResults)
        } else {
            await curdHelper.findByList(this.model, {
                query,
                extraOptions,
                filter,
                ctx,
            })
        }
    }

    async delete(ctx) {
        const id = ctx.params.id
        let query = {}
        id && (query.id = id)

        const beforeDeleteHook = this.pickFiledFromConfig(
            'delete.beforeDeleteHook'
        )
        const afterDeleteHook = this.pickFiledFromConfig(
            'delete.afterDeleteHook'
        )
        const extraOptions = this.pickFiledFromConfig('delete.extraOptions')
        const physicDelete = this.pickFiledFromConfig('delete.physicDelete')
        let queryConfig = this.pickFiledFromConfig('delete.query')

        if (queryConfig) {
            query = LowCodeController.getQuery(
                this.config,
                'delete',
                ctx.query,
                {},
                ctx
            )
        }

        if (beforeDeleteHook) {
            const needReturn = await smartFuncExecute.call(
                this,
                beforeDeleteHook,
                query,
                extraOptions,
                ctx,
            )
            if (needReturn) {
                return null
            }
        }

        let updateDelete = this.updateDelete
        if (usernameField) {
            this.updatorField &&
                (updateDelete[this.updatorField] = _.get(ctx, usernameField))
        }

        if (afterDeleteHook) {
            isAsyncOrPromise(afterDeleteHook)
            await this.sq.transaction(t => {
                if (physicDelete) {
                    return curdHelper
                        .physicDelete(this.model, {
                            query,
                            transaction: t,
                            extraOptions,
                        })
                        .then(() => {
                            return afterDeleteHook.call(
                                this,
                                query,
                                extraOptions,
                                t,
                                ctx,
                            )
                        })
                } else {
                    return curdHelper
                        .delete(this.model, {
                            query,
                            transaction: t,
                            updateObj: updateDelete,
                            extraOptions,
                        })
                        .then(raw => {
                            return afterDeleteHook.call(
                                this,
                                query,
                                extraOptions,
                                raw,
                                t,
                                ctx,
                            )
                        })
                }
            })
        } else {
            if (physicDelete) {
                return curdHelper.physicDelete(this.model, {
                    query,
                    ctx,
                    extraOptions,
                })
            } else {
                return curdHelper.delete(this.model, {
                    query,
                    ctx,
                    extraOptions,
                    updateObj: updateDelete,
                })
            }
        }
    }
}

module.exports = LowCodeController
