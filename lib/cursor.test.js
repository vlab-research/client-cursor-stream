const mocha = require('mocha')
const chai = require('chai')
const sinon = require('sinon')
const should = chai.should()
const { Buffered, ClientCursorStream, cursorResult } = require('./index')


describe('Buffered', () => {
  it('Returns vals', async () => {

    const f = async () => [1,2,3,4]
    const fn = sinon.fake(f)
    const b = new Buffered(fn)
    const res = []
    for (let a of new Array(8)) {
      const r = await b.next()
      res.push(r)
    }

    fn.callCount.should.equal(2)
    res.should.eql([1,2,3,4,1,2,3,4])
  })

  it('Doesnt break when given null or undefined', async () => {
    const f = async () => null
    const fn = sinon.fake(f)
    const b = new Buffered(fn)
    const res = []

    for (let a of new Array(4)) {
      const r = await b.next()
      res.push(r)
    }

    fn.callCount.should.equal(4)
    res.should.eql([null, null, null, null])
  })
})

describe('ClientCursorStream', () => {
  it('Streams data from a continuous function and stops', (done) =>  {

    let i = 0
    const fn = async () => {
      if (i++ < 5) {
        return [[1,2,3], 0]
      }
      return [null, null]
    }

    const stream = new ClientCursorStream(fn, 0)
    const dats = []
    let finished = false

    stream.on('data', (chunk) => {
      dats.push(chunk)
      if (dats.length === 15) {
        dats[0].should.equal(1)
        dats[14].should.equal(3)
        finished = true
      }
    })
    stream.on('end', () => {
      finished.should.be.true
      done()
    })
  })

  it('Works with cursorResult', (done) =>  {

    let i = 0
    const fn = async () => {
      if (i++ < 5) {
        return cursorResult([1,2,3], 0)
      }
      return cursorResult(null, null)
    }

    const stream = new ClientCursorStream(fn, 0)

    stream.on('data', (chunk) => {})
    stream.on('end', () => {
      done()
    })
    stream.on('error', done)
  })

  it('Uses the new limit every time', (done) =>  {

    let i = 0
    const lims = []
    const fn = async (lim, time) => {
      lims.push(lim)
      if (i++ < 5) {
        return [[1,2,3], lim+10]
      }
      return [null, null]
    }

    const stream = new ClientCursorStream(fn, 0)

    stream.on('data', (chunk) => {})
    stream.on('end', () => {
      lims[0].should.equal(0)
      lims[1].should.equal(10)
      lims[5].should.equal(50)
      done()
    })
  })

  it('Uses the same time every time, which is close to when it starts reading', (done) =>  {

    let i = 0
    times = []
    const fn = async (lim, time) => {
      times.push(time)
      if (i++ < 5) {
        return [[1,2,3], lim+10]
      }
      return [null, null]
    }

    const stream = new ClientCursorStream(fn, 0)

    stream.on('data', (chunk) => {})
    const now = new Date()

    stream.on('end', () => {
      for (const t of times) {
        const close = (now - t) < 10
        close.should.be.true
        t.should.equal(times[0])
      }

      done()
    })
  })

  it('Emits an error when the function errors', (done) =>  {
    class TestError extends Error {}

    let i = 0
    const fn = async (lim) => {
      i++
      if (i == 2) {
        throw new TestError('foo')
      }
      else if (i < 2) {
        return [[1,2,3], lim+10]
      }
      return [null, null]
    }

    const stream = new ClientCursorStream(fn, 0)
    const dats = []

    stream.on('data', (chunk) => {
    })
    stream.on('error', err => {
      err.should.be.instanceof(TestError)
      done()
    })
  })

  it('Emits an descriptive error when the query returns not array', (done) =>  {
    class TestError extends Error {}

    let i = 0
    const fn = async (lim) => {
      i++
      if (i === 1) return undefined
      return [null, null]
    }

    const stream = new ClientCursorStream(fn, 0)
    const dats = []

    stream.on('data', (chunk) => {
      done(new Error('this shouldnt happen'))
    })

    stream.on('error', err => {
      err.should.be.instanceof(Error)
      err.message.should.contain('return array of length 2')
      done()
    })
  })
})
