import { CommandHandler } from '@event-driven-io/emmett'
import type { EventStore } from '@event-driven-io/emmett'
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
import type { LiverCancerRiskMonitor, PatientId } from './type.js'

const STREAM_PREFIX = 'liverCancerRisk'

const streamName = (patientId: PatientId) =>
  `${STREAM_PREFIX}-${patientId as string}`

const commandHandler = CommandHandler<
  LiverCancerRiskMonitor | null,
  AlertEvent
>({ evolve, initialState })

const handleRaiseAlertsAfterAltResultRegistered = (
  store: EventStore,
  command: RaiseAlertsAfterAltResultRegistered,
) =>
  commandHandler(store, streamName(command.metadata.patientId), (state) =>
    decide(command, state),
  )

const handleRaiseAlertsAfterFibrosisLevelRegistered = (
  store: EventStore,
  command: RaiseAlertsAfterFibrosisLevelRegistered,
) =>
  commandHandler(store, streamName(command.metadata.patientId), (state) =>
    decide(command, state),
  )

const handleResolveAltSmallAlert = (
  store: EventStore,
  command: ResolveAltSmallAlert,
) =>
  commandHandler(store, streamName(command.metadata.patientId), (state) =>
    decide(command, state),
  )

const handleResolveFibrosisSmallAlert = (
  store: EventStore,
  command: ResolveFibrosisSmallAlert,
) =>
  commandHandler(store, streamName(command.metadata.patientId), (state) =>
    decide(command, state),
  )

const handleResolveLiverCancerRiskBigAlert = (
  store: EventStore,
  command: ResolveLiverCancerRiskBigAlert,
) =>
  commandHandler(store, streamName(command.metadata.patientId), (state) =>
    decide(command, state),
  )

export {
  handleRaiseAlertsAfterAltResultRegistered,
  handleRaiseAlertsAfterFibrosisLevelRegistered,
  handleResolveAltSmallAlert,
  handleResolveFibrosisSmallAlert,
  handleResolveLiverCancerRiskBigAlert,
}
