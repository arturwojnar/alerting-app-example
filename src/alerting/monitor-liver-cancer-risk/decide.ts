import { assertNever, literalObject } from '@chassisjs/hermes'
import type {
  AlertCommand,
  RaiseAlertsAfterAltResultRegistered,
  RaiseAlertsAfterFibrosisLevelRegistered,
  ResolveAltSmallAlert,
  ResolveFibrosisSmallAlert,
  ResolveLiverCancerRiskBigAlert,
} from './command.js'
import type {
  AlertEvent,
  AltSmallAlertRaised,
  AltSmallAlertResolved,
  FibrosisSmallAlertRaised,
  FibrosisSmallAlertResolved,
  LiverCancerRiskBigAlertRaised,
  LiverCancerRiskBigAlertResolved,
} from './event.js'
import type { PatientContext } from './patientContext.js'
import type {
  AlertId,
  AlertPair,
  AltLevel,
  AltSmallAlertState,
  FibrosisLevel,
  FibrosisSmallAlertState,
  LiverCancerRiskMonitor,
} from './type.js'

const ALT_THRESHOLD_MALE = 45
const ALT_THRESHOLD_FEMALE = 35
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000

const isAlarmingAlt = (value: AltLevel, gender: 'male' | 'female') =>
  (value as number) >
  (gender === 'male' ? ALT_THRESHOLD_MALE : ALT_THRESHOLD_FEMALE)

const isAlarmingFibrosis = (value: FibrosisLevel) =>
  value === 'F1' || value === 'F2' || value === 'F3' || value === 'F4'

const toFibrosisNumeric = (f: FibrosisLevel) => {
  switch (f) {
    case 'F0':
      return 0
    case 'F1':
      return 1
    case 'F2':
      return 2
    case 'F3':
      return 3
    case 'F4':
      return 4
  }
}

const calculateAge = (dateOfBirth: string) => {
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age -= 1
  }
  return age
}

const pairDate = (pair: AlertPair) =>
  pair.alt.takenAt > pair.fibrosis.takenAt
    ? pair.alt.takenAt
    : pair.fibrosis.takenAt

const arePairsMonthApart = ([first, second, third]: [
  AlertPair,
  AlertPair,
  AlertPair,
]) => {
  const d1 = pairDate(first).getTime()
  const d2 = pairDate(second).getTime()
  const d3 = pairDate(third).getTime()
  return d2 - d1 >= ONE_MONTH_MS && d3 - d2 >= ONE_MONTH_MS
}

const calculateRiskLevel = (
  [first, second, third]: [AlertPair, AlertPair, AlertPair],
  patientAge: number,
) => {
  const firstAlt = first.alt.value as number
  const secondAlt = second.alt.value as number
  const thirdAlt = third.alt.value as number
  const meanAlt = (firstAlt + secondAlt + thirdAlt) / 3

  const sortedFib = [
    toFibrosisNumeric(first.fibrosis.value),
    toFibrosisNumeric(second.fibrosis.value),
    toFibrosisNumeric(third.fibrosis.value),
  ].sort((a, b) => a - b) as [number, number, number]
  const medianFibrosis = sortedFib[1]

  return (
    (patientAge / 70) * (medianFibrosis / 4) * (meanAlt / (thirdAlt + firstAlt))
  )
}

const newAlertId = () => crypto.randomUUID() as AlertId

const tryFormBigAlert = (
  threePairs: [AlertPair, AlertPair, AlertPair],
  patientId: AlertEvent['metadata']['patientId'],
  patient: PatientContext,
) => {
  if (!arePairsMonthApart(threePairs)) return null
  const riskLevel = calculateRiskLevel(
    threePairs,
    calculateAge(patient.dateOfBirth),
  )
  return literalObject<LiverCancerRiskBigAlertRaised>({
    type: 'LiverCancerRiskBigAlertRaised',
    data: { riskLevel },
    metadata: { alertId: newAlertId(), patientId, raisedAt: new Date() },
  })
}

const decideRaiseAlt = (
  command: RaiseAlertsAfterAltResultRegistered,
  state: LiverCancerRiskMonitor | null,
  patient: PatientContext,
) => {
  const { data, metadata } = command
  if (state?.status === 'BIG_ALERT_RAISED') return []
  if (!isAlarmingAlt(data.value, patient.gender)) return []

  const alertId = newAlertId()
  const altEvent = literalObject<AltSmallAlertRaised>({
    type: 'AltSmallAlertRaised',
    data: { value: data.value, takenAt: data.testTakenAt },
    metadata: { alertId, patientId: metadata.patientId },
  })

  const currentPairs = state?.pairs ?? []
  const pendingFibrosis = state?.pendingFibrosis ?? null
  if (pendingFibrosis === null) return [altEvent]

  const newAlt: AltSmallAlertState = {
    alertId,
    value: data.value,
    takenAt: data.testTakenAt,
  }
  const newPair: AlertPair = { alt: newAlt, fibrosis: pendingFibrosis }

  if (currentPairs.length === 2) {
    const threePairs = [...currentPairs, newPair] as [
      AlertPair,
      AlertPair,
      AlertPair,
    ]
    const bigAlert = tryFormBigAlert(threePairs, metadata.patientId, patient)
    if (bigAlert) return [altEvent, bigAlert]
  }

  return [altEvent]
}

const decideRaiseFibrosis = (
  command: RaiseAlertsAfterFibrosisLevelRegistered,
  state: LiverCancerRiskMonitor | null,
  patient: PatientContext,
) => {
  const { data, metadata } = command
  if (state?.status === 'BIG_ALERT_RAISED') return []
  if (!isAlarmingFibrosis(data.value)) return []

  const alertId = newAlertId()
  const fibrosisEvent = literalObject<FibrosisSmallAlertRaised>({
    type: 'FibrosisSmallAlertRaised',
    data: { value: data.value, takenAt: data.testTakenAt },
    metadata: { alertId, patientId: metadata.patientId },
  })

  const currentPairs = state?.pairs ?? []
  const pendingAlt = state?.pendingAlt ?? null
  if (pendingAlt === null) return [fibrosisEvent]

  const newFibrosis: FibrosisSmallAlertState = {
    alertId,
    value: data.value,
    takenAt: data.testTakenAt,
  }
  const newPair: AlertPair = { alt: pendingAlt, fibrosis: newFibrosis }

  if (currentPairs.length === 2) {
    const threePairs = [...currentPairs, newPair] as [
      AlertPair,
      AlertPair,
      AlertPair,
    ]
    const bigAlert = tryFormBigAlert(threePairs, metadata.patientId, patient)
    if (bigAlert) return [fibrosisEvent, bigAlert]
  }

  return [fibrosisEvent]
}

const decideResolveAlt = (
  command: ResolveAltSmallAlert,
  state: LiverCancerRiskMonitor | null,
) => {
  const { metadata } = command
  if (!state || state.status === 'BIG_ALERT_RAISED') return []
  if (
    state.pendingAlt === null ||
    state.pendingAlt.alertId !== metadata.alertId
  )
    return []
  return [
    literalObject<AltSmallAlertResolved>({
      type: 'AltSmallAlertResolved',
      data: {},
      metadata: {
        alertId: metadata.alertId,
        patientId: metadata.patientId,
        resolvedBy: metadata.resolvedBy,
        resolvedAt: new Date(),
      },
    }),
  ]
}

const decideResolveFibrosis = (
  command: ResolveFibrosisSmallAlert,
  state: LiverCancerRiskMonitor | null,
) => {
  const { metadata } = command
  if (!state || state.status === 'BIG_ALERT_RAISED') return []
  if (
    state.pendingFibrosis === null ||
    state.pendingFibrosis.alertId !== metadata.alertId
  )
    return []
  return [
    literalObject<FibrosisSmallAlertResolved>({
      type: 'FibrosisSmallAlertResolved',
      data: {},
      metadata: {
        alertId: metadata.alertId,
        patientId: metadata.patientId,
        resolvedBy: metadata.resolvedBy,
        resolvedAt: new Date(),
      },
    }),
  ]
}

const decideResolveBigAlert = (
  command: ResolveLiverCancerRiskBigAlert,
  state: LiverCancerRiskMonitor | null,
) => {
  const { metadata } = command
  if (!state || state.status !== 'BIG_ALERT_RAISED') return []
  if (state.bigAlert.alertId !== metadata.alertId) return []

  const resolvedAt = new Date()
  const pairEvents = state.pairs.flatMap((pair) => [
    literalObject<AltSmallAlertResolved>({
      type: 'AltSmallAlertResolved',
      data: {},
      metadata: {
        alertId: pair.alt.alertId,
        patientId: metadata.patientId,
        resolvedBy: metadata.resolvedBy,
        resolvedAt,
      },
    }),
    literalObject<FibrosisSmallAlertResolved>({
      type: 'FibrosisSmallAlertResolved',
      data: {},
      metadata: {
        alertId: pair.fibrosis.alertId,
        patientId: metadata.patientId,
        resolvedBy: metadata.resolvedBy,
        resolvedAt,
      },
    }),
  ])

  return [
    ...pairEvents,
    literalObject<LiverCancerRiskBigAlertResolved>({
      type: 'LiverCancerRiskBigAlertResolved',
      data: {},
      metadata: {
        alertId: metadata.alertId,
        patientId: metadata.patientId,
        resolvedBy: metadata.resolvedBy,
        resolvedAt,
      },
    }),
  ]
}

const decide = (
  command: AlertCommand,
  state: LiverCancerRiskMonitor | null,
  patient: PatientContext,
) => {
  switch (command.type) {
    case 'RaiseAlertsAfterAltResultRegistered':
      return decideRaiseAlt(command, state, patient)
    case 'RaiseAlertsAfterFibrosisLevelRegistered':
      return decideRaiseFibrosis(command, state, patient)
    case 'ResolveAltSmallAlert':
      return decideResolveAlt(command, state)
    case 'ResolveFibrosisSmallAlert':
      return decideResolveFibrosis(command, state)
    case 'ResolveLiverCancerRiskBigAlert':
      return decideResolveBigAlert(command, state)
    default:
      return assertNever(command)
  }
}

export { decide }
