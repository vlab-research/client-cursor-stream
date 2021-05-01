# client-cursor-stream

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

  if (!fin) return cursorResult(null, null)

  return cursorResult(res.rows, fin['timestamp'])
}

const pool = Pool()
const fn = (lim, time) => responsesQuery(pool, email, survey, time, lim)
const stream = new ClientCursorStream(fn, new Date('1970-01-01'))

// stream is a Readable stream, each chunk will be a res.rows object
// it will end when there are no more results
```
