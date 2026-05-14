import { getPostgreSQLEventStore } from '@event-driven-io/emmett-postgresql'
import type {
  PostgresEventStore,
  PostgresEventStoreOptions,
} from '@event-driven-io/emmett-postgresql'
import { pongoClient } from '@event-driven-io/pongo'
import type { PongoClient, PongoDb } from '@event-driven-io/pongo'

const connectionString = () => {
  const cs = process.env['DATABASE_URL']
  if (!cs) throw new Error('DATABASE_URL environment variable is not set')
  return cs
}

let _storeOptions: PostgresEventStoreOptions | undefined
let _eventStore: PostgresEventStore | null = null
let _pongo: PongoClient | null = null

const configureEventStore = (options: PostgresEventStoreOptions) => {
  _storeOptions = options
}

const getEventStore = () => {
  if (!_eventStore)
    _eventStore = getPostgreSQLEventStore(connectionString(), _storeOptions)
  return _eventStore
}

const getPongoDb = (): PongoDb => {
  if (!_pongo) _pongo = pongoClient(connectionString())
  return _pongo.db()
}

const connectDb = async () => {
  if (!_pongo) _pongo = pongoClient(connectionString())
  await _pongo.connect()
  console.info('Connected to database')
}

const closeDb = async () => {
  await _pongo?.close()
  _pongo = null
  _eventStore = null
}

export { configureEventStore, getEventStore, getPongoDb, connectDb, closeDb }
