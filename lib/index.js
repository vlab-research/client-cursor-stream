const {Readable} = require('stream')

class Buffered {
  constructor(fn) {
    this.fn = fn
    this.buff = []
  }

  async next() {
    if (this.buff.length === 0) {
      const res = await this.fn()
      if (!res) return res
      this.buff = res
    }

    return this.buff.shift()
  }
}

// query is a function that takes a limit and a timestamp and
// returns a promise that resolves to an array
// and a new limit
class ClientCursorStream extends Readable {
  constructor(query, init, streamOpts) {
    super({objectMode: true, ...streamOpts})
    this.query = query
    this.lim = init
    this.dat = []

    this.buffer = new Buffered(this._fetch.bind(this))
  }

  async _fetch() {
    const qr = await this.query(this.lim, this.started)

    if (!Array.isArray(qr) || qr.length !== 2) {
      throw new Error('Query function from DBStream did not return array of length 2: ', qr)
    }

    const [res, lim] = qr
    if (!res) return null
    this.lim = lim
    return res
  }

  async _go() {
    this.running = true
    this.started = new Date()

    while (true) {
      try {
        const res = await this.buffer.next()
        if (!this.push(res)) break
        if (res === null) {
          this.emit('end')
          break
        }
      }
      catch (e) {
        this.emit('error', e)
        break
      }
    }
    this.running = false
  }

  _read() {
    if (!this.running) this._go()
  }
}

function cursorResult(res, lim) {
  if (lim === undefined) {
    throw new Error(`cursorResult needs to be passed a valid limit. Was passed: ${lim}`)
  }

  return [res, lim]
}


module.exports = { Buffered, ClientCursorStream, cursorResult }
