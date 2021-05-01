# client-cursor-stream

A simple node.js library for implementing a client-side database cursor, with any database driver, with results provided as a node Readable stream.

## Install

``` shell
npm install @vlab-research/client-cursor-stream
```

## Usage

Example using `pg` to query through postgres results (or CockroachDB results!):

``` javascript
const { ClientCursorStream, cursorResult } = require('@vlab-research/client-cursor-stream')
const { Pool } = require('pg')

async function responsesQuery(pool, email, time, lim) {

  const query = `SELECT foo FROM bar
                 AS OF SYSTEM TIME $1
                 WHERE email = $2
                 AND timestamp > $3
                 ORDER BY timestamp
                 LIMIT 10000`

  const res = await pool.query(query, [time, email, lim])
  const fin = res.rows.slice(-1)[0]

  // return a cursorResult called with (null, null) when done
  if (!fin) return cursorResult(null, null)

  // return a cursorResult with an array of results and the new "limit",
  // the key for pagination, when there are some results
  return cursorResult(res.rows, fin['timestamp'])
}

const pool = Pool()

// ClientCursorStream is initialized with:
// 1. a function that takes (lim, time) and returns a cursorResult
// 2. the first limit (the minimum value of the key on which you paginate)
const fn = (lim, time) => responsesQuery(pool, email, survey, time, lim)
const stream = new ClientCursorStream(fn, new Date('1970-01-01'))

// stream is a Readable stream, each chunk will be a single element of the
// returned array (in this case, the res.rows array). it will end when
// there are no more results
```
