const validatorjs = require('validatorjs')
validatorjs.useLang('zh')

module.exports = {
    validateJson: (data, rules) => {
        const errMessage = []
        const result = {
            message: '',
            success: true,
        }
        const validateRule = {}
        const customName = {}
        for (let key in rules) {
            const { rule, name } = rules[key]
            validateRule[key] = rule
            customName[key] = name
        }
        const validator = new validatorjs(data, validateRule)
        validator.setAttributeNames(customName)
        if (validator.fails()) {
            for (let message in validator.errors.all()) {
                errMessage.push(validator.errors.first(message))
            }
        }
        if (errMessage.length > 0) {
            result.success = false
            result.message = errMessage.join('')
        }
        return result
    },
}
