module.exports = {
    mysql_options: {
        dataBase: 'json-controller-test',
        account: 'root',
        pwd: 'mysql',
        options: {
            host: '127.0.0.1',
            port: 3306,
            dialect: 'mysql',
            dialectOptions: {
                charset: 'utf8mb4',
                supportBigNumbers: true,
            },
            define: {
                charset: 'utf8mb4',
            },
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000,
            },
            timezone: '+08:00',
        },
    },
}
