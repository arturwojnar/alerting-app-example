import type { DeepReadonly } from '@event-driven-io/emmett'
import type { Flavour, PositiveInteger } from '@chassisjs/hermes'

type PatientId = Flavour<string, 'PatientId'>
type DoctorId = Flavour<string, 'DoctorId'>
type AlertId = Flavour<string, 'AlertId'>
type AltLevel = Flavour<PositiveInteger, 'AltLevel'>
type FibrosisLevel = 'F0' | 'F1' | 'F2' | 'F3' | 'F4'
type PatientGender = 'male' | 'female'

type AltSmallAlertState = DeepReadonly<{
  alertId: AlertId
  value: AltLevel
  takenAt: Date
}>

type FibrosisSmallAlertState = DeepReadonly<{
  alertId: AlertId
  value: FibrosisLevel
  takenAt: Date
}>

type AlertPair = DeepReadonly<{
  alt: AltSmallAlertState
  fibrosis: FibrosisSmallAlertState
}>

type LiverCancerRiskBigAlert = DeepReadonly<{
  alertId: AlertId
  riskLevel: number
  raisedAt: Date
}>

type LiverCancerRiskMonitor =
  | DeepReadonly<{
      status: 'MONITORING'
      pairs: AlertPair[]
      pendingAlt: AltSmallAlertState | null
      pendingFibrosis: FibrosisSmallAlertState | null
      bigAlert: null
    }>
  | DeepReadonly<{
      status: 'BIG_ALERT_RAISED'
      pairs: [AlertPair, AlertPair, AlertPair]
      pendingAlt: null
      pendingFibrosis: null
      bigAlert: LiverCancerRiskBigAlert
    }>

export type {
  PatientId,
  DoctorId,
  AlertId,
  AltLevel,
  FibrosisLevel,
  PatientGender,
  AltSmallAlertState,
  FibrosisSmallAlertState,
  AlertPair,
  LiverCancerRiskBigAlert,
  LiverCancerRiskMonitor,
}
