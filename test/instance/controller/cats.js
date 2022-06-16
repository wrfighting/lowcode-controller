const { LowCodeController } = require('../../../index')
const cats_model = require('../model/cat_model')
const path = require('path')

LowCodeController.setGlobalDBPath(path.join(__dirname, '../db/mysql'))
LowCodeController.setUserNameField('username')
// LowCodeController.setCustomResField('code', 'msg', 'data')

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
                    // like: true,
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
            beforeQueryHook: async function () {
                console.log('before query hook')
            },
        },
        getList: {
            query: {
                birthday: {
                    type: 'varTime',
                    value: ['start', 'end'],
                }
            },
            extraOptions: {
                order: [['cat_name', 'DESC']],
                attributes: ['cat_name', 'age', 'job'],
            },
            afterQueryHook: async function (sourceResults) {
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
            afterUpdateHook: async function (updateItem) {
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
