const app = require('./instance/app')
const agent = require('supertest').agent(app)
const should = require('should')
var catId

describe('cats api test', function () {
    describe('GET /public/cats/hello', function () {
        it('should cats say hello', function (done) {
            agent
                .get('/public/cats/hello')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err)
                    const { errno, data } = res.body
                    should.equal(errno, 0)
                    should.equal(data, 'hello world')
                    done()
                })
        })
    })
    describe('GET /api/cats', function () {
        it('should get cats page query', function (done) {
            agent
                .get('/api/cats?cat_name=haha')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err)
                    const { errno, data } = res.body
                    console.log(res.body)
                    should.equal(errno, 0)
                    should.equal(data.list.length, 1)
                    done()
                })
        })
    })
    describe('POST /api/cats', function () {
        it('should add cat', function (done) {
            agent
                .post('/api/cats')
                .send({
                    cat_name: `haha_${Date.now()}`,
                    job: 'student',
                    birthday: '2000-10-11 00:00:00'
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err)
                    const body = res.body
                    should.equal(body.errno, 0)
                    body.should.be.have.property('data')
                    catId = body.data.id
                    done()
                })
        })
    })
    describe('PUT /api/cats/:id', function () {
        it('should edit cat', function (done) {
            agent
                .put(`/api/cats/${catId}`)
                .send({
                    job: 'worker',
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err)
                    const body = res.body
                    should.equal(body.errno, 0)
                    done()
                })
        })
    })
    describe('GET /api/cats/list', function () {
        it('should get cats list', function (done) {
            agent
                .get('/api/cats/list?start=1999-01-01&end=2001-01-01')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err)
                    const body = res.body
                    should.equal(body.errno, 0)
                    body.should.be.have.property('data')
                    should.equal(body.data[0].desc, 'cute cat')
                    done()
                })
        })
    })
    describe('PUT /api/cats/:id rollback', function () {
        it('should edit cat', function (done) {
            agent
                .put(`/api/cats/${catId}`)
                .send({
                    job: 'rollback',
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err)
                    const body = res.body
                    should.equal(body.errno, 1)
                    done()
                })
        })
    })
    describe('PUT /api/cats batch', function () {
        it('should edit cat batch', function (done) {
            agent
                .put(`/api/cats`)
                .send({
                    job: 'student',
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err)
                    const body = res.body
                    should.equal(body.errno, 0)
                    done()
                })
        })
    })
    describe('GET /api/cats/:id', function () {
        it('should get a single cat', function (done) {
            agent
                .get(`/api/cats/${catId}`)
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err)
                    const body = res.body
                    should.equal(body.errno, 0)
                    should.equal(body.data.id, catId)
                    should.equal(body.data.job, 'student')
                    done()
                })
        })
    })
    describe('DELETE /api/cats/:id', function () {
        it('should delete cat', function (done) {
            agent
                .del(`/api/cats/${catId}`)
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err)
                    const body = res.body
                    should.equal(body.errno, 0)
                    done()
                })
        })
    })
})
