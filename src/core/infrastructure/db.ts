import { getPostgreSQLEventStore } from '@event-driven-io/emmett-postgresql'
import type { PostgresEventStore } from '@event-driven-io/emmett-postgresql'
import { pongoClient } from '@event-driven-io/pongo'
import type { PongoClient, PongoDb } from '@event-driven-io/pongo'

const connectionString = () => {
  const cs = process.env['DATABASE_URL']
  if (!cs) throw new Error('DATABASE_URL environment variable is not set')
  return cs
}

let _eventStore: PostgresEventStore | null = null
let _pongo: PongoClient | null = null

const getEventStore = () => {
  if (!_eventStore) _eventStore = getPostgreSQLEventStore(connectionString())
  return _eventStore
}

const getPongoDb = (): PongoDb => {
  if (!_pongo) _pongo = pongoClient(connectionString())
  return _pongo.db()
}

const connectDb = async () => {
  if (!_pongo) _pongo = pongoClient(connectionString())
  await _pongo.connect()
}

const closeDb = async () => {
  await _pongo?.close()
  _pongo = null
  _eventStore = null
}

export { getEventStore, getPongoDb, connectDb, closeDb }
