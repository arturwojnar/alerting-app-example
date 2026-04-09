import { CommandHandler } from '@event-driven-io/emmett'
import type { EventStore } from '@event-driven-io/emmett'
import type { PongoDb } from '@event-driven-io/pongo'
import type {
  RaiseAlertsAfterAltResultRegistered,
  RaiseAlertsAfterFibrosisLevelRegistered,
  ResolveAltSmallAlert,
  ResolveFibrosisSmallAlert,
  ResolveLiverCancerRiskBigAlert,
} from './command.js'
import { decide } from './decide.js'
import type { AlertEvent } from './event.js'
import { evolve, initialState } from './evolve.js'
import { getPatientContext } from './patientContext.js'
import type { LiverCancerRiskMonitor, PatientId } from './type.js'

const STREAM_PREFIX = 'liverCancerRisk'

const streamName = (patientId: PatientId) =>
  `${STREAM_PREFIX}-${patientId as string}`

const commandHandler = CommandHandler<LiverCancerRiskMonitor | null, AlertEvent>(
  { evolve, initialState },
)

const requirePatientContext = async (db: PongoDb, patientId: PatientId) => {
  const patient = await getPatientContext(db, patientId)
  if (!patient)
    throw new Error(`PatientContext not found: ${patientId as string}`)
  return patient
}

const handleRaiseAlertsAfterAltResultRegistered = async (
  store: EventStore,
  db: PongoDb,
  command: RaiseAlertsAfterAltResultRegistered,
) => {
  const { patientId } = command.metadata
  const patient = await requirePatientContext(db, patientId)
  await commandHandler(store, streamName(patientId), (state) =>
    decide(command, state, patient),
  )
}

const handleRaiseAlertsAfterFibrosisLevelRegistered = async (
  store: EventStore,
  db: PongoDb,
  command: RaiseAlertsAfterFibrosisLevelRegistered,
) => {
  const { patientId } = command.metadata
  const patient = await requirePatientContext(db, patientId)
  await commandHandler(store, streamName(patientId), (state) =>
    decide(command, state, patient),
  )
}

const handleResolveAltSmallAlert = async (
  store: EventStore,
  db: PongoDb,
  command: ResolveAltSmallAlert,
) => {
  const { patientId } = command.metadata
  const patient = await requirePatientContext(db, patientId)
  await commandHandler(store, streamName(patientId), (state) =>
    decide(command, state, patient),
  )
}

const handleResolveFibrosisSmallAlert = async (
  store: EventStore,
  db: PongoDb,
  command: ResolveFibrosisSmallAlert,
) => {
  const { patientId } = command.metadata
  const patient = await requirePatientContext(db, patientId)
  await commandHandler(store, streamName(patientId), (state) =>
    decide(command, state, patient),
  )
}

const handleResolveLiverCancerRiskBigAlert = async (
  store: EventStore,
  db: PongoDb,
  command: ResolveLiverCancerRiskBigAlert,
) => {
  const { patientId } = command.metadata
  const patient = await requirePatientContext(db, patientId)
  await commandHandler(store, streamName(patientId), (state) =>
    decide(command, state, patient),
  )
}

export {
  handleRaiseAlertsAfterAltResultRegistered,
  handleRaiseAlertsAfterFibrosisLevelRegistered,
  handleResolveAltSmallAlert,
  handleResolveFibrosisSmallAlert,
  handleResolveLiverCancerRiskBigAlert,
}
