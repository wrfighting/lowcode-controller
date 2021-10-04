# lowcode-controller

lowcode-controller是一个可以用json来配置化的生成对应的controller逻辑的工具，它允许配置化的生成分页查询、查询单条、查询列表、新增、更新、删除逻辑，能够覆盖大部分crud场景
你也可以通过class的方法重写和定义自己的逻辑处理
它也提供了各个阶段的生命周期，你可以在对应的生命周期定义自己的逻辑

## 安装 ##

````
npm install --save lowcode-controller
````

## 基本使用

```javascript
//in your controller  /controller/cats.js
const { LowCodeController } = require('lowcode-controller')
const cats_model = require('../model/cat_model')
const path = require('path')

LowCodeController.setGlobalDBPath(path.join(__dirname, '../db/mysql'))
LowCodeController.setUserNameField('username')

class CatsController extends LowCodeController {
    constructor(model, config, db, extraOptions) {
        super(model, config, null, extraOptions)
    }

    async sayHello(ctx) {
        ctx.body = { errno: 0, message: 'hello world', data: 'hello world' }
    }
}

const Cats = new CatsController(
    cats_model,
    {
        pageQuery: {
            query: {
                cat_name: {
                    like: true,
                    value: 'cat_name',
                },
                age: {
                    type: 'constant',
                    value: 2,
                },
            },
            extraOptions: {
                order: [['cat_name', 'DESC']],
                attributes: ['cat_name', 'age', 'job'],
            },
            beforeQueryHook: async function (ctx) {
                console.log('before query hook')
                return null
            },
        },
        getList: {
            extraOptions: {
                order: [['cat_name', 'DESC']],
                attributes: ['cat_name', 'age', 'job'],
            },
            afterQueryHook: async function (ctx, sourceResults) {
                sourceResults.forEach(item => {
                    item.desc = 'cute cat'
                })
                return sourceResults
            },
        },
        create: {
            validate: {
                cat_name: {
                    name: 'cat name',
                    rule: 'required',
                },
            },
            constantCreate: {
                age: 2,
            },
            enableBatch: true,
        },
        update: {
            pick: ['job'],
            query: {
                job: 'student',
            },
            afterUpdateHook: async function (ctx, t, updateItem) {
                if (updateItem.job === 'rollback') {
                    throw new Error('roll back')
                }
            },
        },
    },
    null,
    {
        creatorField: 'creator',
        updatorField: 'updator',
    }
)

module.exports = Cats
```

```javascript
//router.js

//you can choose the routing module you like
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
```

```javascript
//app.js
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const router = require('./router')

const app = new Koa()

app.use(async (ctx, next) => {
    ctx.username = 'admin'
    await next()
})
//lowcode-controller need ctx.query and ctx.request.body
app.use(bodyParser())

//you can choose the routing module you like
app.use(router.routes()).use(router.allowedMethods())

const server = app.listen(3000, function () {
    console.log('server is listen on 3000')
})
```



## 方法

### 构造函数

| 参数名       | 二级参数     | 说明                    |
| ------------ | ------------ | ----------------------- |
| model        |              | 数据库model             |
| config       | 参考二级参数 | 各个方法的配置          |
|              | pageQuery    |                         |
|              | create       |                         |
|              | update       |                         |
|              | getSingle    |                         |
|              | getList      |                         |
|              | delete       |                         |
| db           |              | mysql sequelize实例     |
| extraOptions | 参考二级参数 |                         |
|              | creatorField | String 创建人字段       |
|              | updatorField | String 创建人字段       |
|              | defaultQuery | Object 默认查询条件     |
|              | updateDelete | Object 逻辑删除更新字段 |

### 静态方法

#### setGlobalDBPath

| 参数名 | 说明                           |
| ------ | ------------------------------ |
| dbPath | 设置全局db sequelize实例的路径 |

#### setUserNameField

| 参数名 | 说明                                               |
| ------ | -------------------------------------------------- |
| field  | 设置从ctx里取出的用户唯一表示字段，支持xxx.xxx形式 |

### 实例方法

所有路由类实例方法参数都是ctx

#### pageQuery

对应到构造函数中的config.pageQuery，配置项说明如下

| 参数名          | 类型                                                         | 说明                                                         |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| query           | Object                                                       | 查询条件，具体字段见后面的说明                               |
| beforeQueryHook | function\|async function(query, extraOptions, ctx)           | 在执行数据库查询之前执行，函数里return将会阻断后续执行       |
| afterQueryHook  | function\|async function(ctx, sourceResults, query, extraOptions) | 在执行数据库查询之后执行，函数里return的值将会作为最后的接口data的返回结果  sourceResults是从数据库查出来的数据 |
| filter          | function                                                     | 查询数据库后，将结果放到filter函数执行过滤操作               |
| extraOptions    | Object                                                       | 额外设置，会透传给sequelize执行                              |

#### create

| 参数名           | 类型                                                   | 说明                                                         |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| validate         | Object                                                 | 参数验证配置                                                 |
| beforeInsertHook | function\|async function(createItem, ctx)              | 在执行数据库插入之前执行，createItem为插入数据库的实体对象   |
| afterInsertHook  | function\|async function(insertItem, transaction, ctx) | 在执行数据库插入之后执行，insertItem为插入数据库的实体对象， transaction是sequelize事务标志 |
| constantCreate   | Object                                                 | 用该对象的字段覆盖插入的字段值                               |
| extraOptions     | Object                                                 | 额外设置，会透传给sequelize执行                              |
| pickCreate       | Object                                                 | 举例{age: 'newAge'} 从createItem中的newAge值覆盖到createItem中的age字段上 |
| enbaleBatch      | Boolean                                                | 默认false，开启后，支持传数组，进行批量插入                  |

#### update

| 参数名           | 类型                                                         | 说明                                                         |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| query            | Object                                                       | 查询条件，具体字段见后面的说明                               |
| beforeUpdateHook | function\|async function(updateItem, item, ctx)              | 在执行数据库更新之前执行，updateItem为传参的更新内容，item为数据库查询的更新内容 |
| afterUpdateHook  | function\|async function(updateItem, item, raw, transaction, ctx) | 在执行数据库更新之后执行，updateItem为传参的更新内容，item为数据库查询的更新内容，raw为数据库update返回值，t为事务标志 |
| filter           | function                                                     | 查询数据库后，将结果放到filter函数执行过滤操作               |
| extraOptions     | Object                                                       | 额外设置，会透传给sequelize执行                              |
| validate         | Object                                                       | 参数验证配置                                                 |
| itemBlock        | Object                                                       | 配置更新对象的字段，不符合预期直接返回错误，比如{age: { value: 12, message: 'wrong age' }} |
| pick             | Array                                                        | 从传参里提取哪些字段进行更新                                 |

#### getSingle

| 参数名          | 类型                                                         | 说明                                                         |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| query           | Object                                                       | 查询条件，具体字段见后面的说明                               |
| beforeQueryHook | function\|async function(query, extraOptions, ctx)           | 在执行数据库查询之前执行，函数里return将会阻断后续执行       |
| afterQueryHook  | function\|async function(sourceResults, query, extraOptions, ctx) | 在执行数据库查询之后执行，函数里return的值将会作为最后的接口data的返回结果  sourceResults是从数据库查出来的数据 |
| filter          | function                                                     | 查询数据库后，将结果放到filter函数执行过滤操作               |
| extraOptions    | Object                                                       | 额外设置，会透传给sequelize执行                              |

#### getList

| 参数名          | 类型                                                         | 说明                                                         |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| query           | Object                                                       | 查询条件，具体字段见后面的说明                               |
| beforeQueryHook | function\|async function(ctx, query, extraOptions)           | 在执行数据库查询之前执行，函数里return将会阻断后续执行       |
| afterQueryHook  | function\|async function(sourceResults, query, extraOptions, ctx) | 在执行数据库查询之后执行，函数里return的值将会作为最后的接口data的返回结果  sourceResults是从数据库查出来的数据 |
| filter          | function                                                     | 查询数据库后，将结果放到filter函数执行过滤操作               |
| extraOptions    | Object                                                       | 额外设置，会透传给sequelize执行                              |

#### delete

| 参数名           | 类型                                                         | 说明                                                   |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| query            | Object                                                       | 查询条件，具体字段见后面的说明                         |
| beforeDeleteHook | function\|async function(query, extraOptions, ctx)           | 在执行数据库查询之前执行，函数里return将会阻断后续执行 |
| afterDeleteHook  | function\|async function(query, extraOptions, transaction, ctx) | 在执行数据库查询之后执行，t为事务标志                  |
| extraOptions     | Object                                                       | 额外设置，会透传给sequelize执行                        |
| physicDelete     | Boolean                                                      | 是否进行物理删除，true是，false否，默认false           |

#### query ####

````javascript
{
  //比如请求传过来的cat_name为haha，就模糊查询数据库里cat_name为haha的内容
  'cat_name': {  //查询字段名cat_name
    'like': true,  //是否模糊查询
    'value': 'cat_name',  //从请求参数里取cat_name字段作为查询条件值
    'require': true //请求参数里的cat_name字段必须有值   
  },
   //查询数据库中age为2的内容 
   'age': {
     'type': 'constant', //查询的value为一个常量
     'value': 2 //常量值为2
   },
   //查询数据库字段cat_job里包含了请求传过来的job的内容  
   'cat_job': { //数据库字段为cat_job
     'value': 'job', //从请求参数里取job字段作为查询条件值
     'json': true //数据库cat_job是一个json类型，启用JSON_CONTAINS进行查询
   },
   //查询数据库字段creator的值为ctx里的username的内容  
   'creator': {
     'type': 'constant',
     'ctxField': 'username'  
   }, 
   //查询数据库字段birthday，大于等于请求参数里的startTime，小于等于endTime的字段  
   'birthday': {
     'type': 'varTime', //时间字段查询
     'value': ['startTime', 'endTime'] //从请求参数里取数组第一个字段为开始时间值，第二个为结束时间值
   } 
  //以上条件没加特殊操作符，默认都是and
  
  //以下查询条件都是or
  '$or': {
    //从请求参数里取为color的字段比如['black', 'white']，然后查询数据库字段color为这两种颜色之一的内容
    'color': {
      'type': 'varArray', //表面查询条件是一个数组
      'value': 'color'  
    }，
    //查询数据库字段height不等于30的内容
    'height': {
      'type': 'constant',//查询的value为一个常量
      'operator': '$ne',   
      'value': 30 //常量值不等于30
    },
    //查询数据库字段weight为50或者100的内容  
    'weight': {
      'type': 'constant',
      'operator': '$in',   
      'value': [50, 100]
    },
    //查询数据库字段birthday小于等于2000-10-11的内容
    'birthday': {
      'type': 'constant',
      'operator': '$time', //时间字段查询 
      'value': [null, '2000-10-11'] //数组第一项为空无开始时间，第二项作为结束时间
    } 
  }
  //以上条件总的为查询(cat_name、age、cat_job creator birthday) and (or (color height weight birthday))
}
````