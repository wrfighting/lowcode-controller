const _ = require('lodash')
const Op = require('sequelize').Op

exports.isAsyncFunction = fn => {
    return Object.prototype.toString.call(fn) === '[object AsyncFunction]'
}

exports.isPromise = fn => {
    return (
        !!fn &&
        (typeof fn === 'object' || typeof fn === 'function') &&
        typeof fn.then === 'function'
    )
}

exports.resSuccess = (data, message) => {
    return {
        errno: 0,
        errmsg: message || 'success',
        data: data || null,
    }
}

exports.resFail = (code, message, data) => {
    return {
        errno: code,
        errmsg: message || 'fail',
        data: data || null,
    }
}

exports.smartFuncExecute = async function (func, ...args) {
    if (Object.prototype.toString.call(func) === '[object AsyncFunction]') {
        return await func.call(this, ...args)
    } else {
        return func.call(this, ...args)
    }
}

exports.isAsyncOrPromise = fn => {
    if (!exports.isAsyncFunction(fn) && !exports.isPromise(fn)) {
        throw new Error('afterXXXHook must be one of async function or promise')
    }
}

exports.errCatch = ctx => err => {
    if (_.get(ctx, 'logger.error')) {
        ctx.logger.error(err)
    } else {
        console.error(err)
    }
    if (ctx) {
        return (ctx.body = this.resFail(1, err.message, err))
    }
}

exports.batchAsyncFuncExec = async (asyncFunc, items = [], count = 50) => {
    if (!exports.isAsyncFunction(asyncFunc)) {
        throw Error('asyncFunc is not a validate async function')
    }
    let promises = []
    let result = []
    for (let i = 0; i < items.length; i++) {
        let item = items[i]
        if ((i + 1) % count === 0) {
            promises.push(asyncFunc(item))
            result = result.concat(await Promise.all(promises))
            promises = []
        } else {
            promises.push(asyncFunc(item))
        }
    }
    if (promises.length > 0) {
        result = result.concat(await Promise.all(promises))
    }
    return result
}

exports.timeQuery = (value, sourceBody) => {
    let query = {}
    let none = true
    let start = (sourceBody && value[0]) ? sourceBody[value[0]] : value[0]
    let end = (sourceBody && value[1]) ? sourceBody[value[1]] : value[1]
    start && (query[Op.gte] = start) && (none = false)
    end && (query[Op.lte] = end) && (none = false)
    return none ? null : query
}
