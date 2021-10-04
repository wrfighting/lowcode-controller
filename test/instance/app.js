const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const router = require('./router')

const app = new Koa()

app.use(async (ctx, next) => {
    ctx.username = 'admin'
    await next()
})

app.use(bodyParser())

app.use(router.routes()).use(router.allowedMethods())

const server = app.listen(3000, function () {
    console.log('server is listen on 3000')
})

module.exports = server
