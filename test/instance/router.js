const router = require('koa-router')()
const Cat = require('./controller/cats')

router.get('/public/cats/hello', Cat.sayHello)
router.get('/api/cats', Cat.pageQuery)
router.post('/api/cats', Cat.create)
router.get('/api/cats/list', Cat.getList)
router.get('/api/cats/:id', Cat.getSingle)
router.put('/api/cats', Cat.update)
router.put('/api/cats/:id', Cat.update)
router.delete('/api/cats/:id', Cat.delete)

module.exports = router
