import type { Command } from '@event-driven-io/emmett'
import type {
  AlertId,
  AltLevel,
  DoctorId,
  FibrosisLevel,
  PatientId,
} from './type.ts'

type RaiseAlertsAfterAltResultRegistered = Command<
  'RaiseAlertsAfterAltResultRegistered',
  { value: AltLevel; testTakenAt: Date },
  { patientId: PatientId }
>
type RaiseAlertsAfterFibrosisLevelRegistered = Command<
  'RaiseAlertsAfterFibrosisLevelRegistered',
  { value: FibrosisLevel; resultTakenAt: Date },
  { patientId: PatientId }
>
type ResolveAltSmallAlert = Command<
  'ResolveAltSmallAlert',
  {},
  { alertId: AlertId; resolvedBy: DoctorId; timestamp: Date }
>
type ResolveFibrosisLevelSmallAlert = Command<
  'ResolveFibrosisLevelSmallAlert',
  {},
  { alertId: AlertId; resolvedBy: DoctorId; timestamp: Date }
>
type ResolveLiverCancerRiskBigAlert = Command<
  'ResolveLiverCancerRiskBigAlert',
  {},
  { alertId: AlertId; timestamp: Date }
>
type AlertCommand =
  | RaiseAlertsAfterAltResultRegistered
  | RaiseAlertsAfterFibrosisLevelRegistered
  | ResolveAltSmallAlert
  | ResolveFibrosisLevelSmallAlert
  | ResolveLiverCancerRiskBigAlert

export type {
  AlertCommand,
  RaiseAlertsAfterAltResultRegistered,
  RaiseAlertsAfterFibrosisLevelRegistered,
  ResolveAltSmallAlert,
  ResolveFibrosisLevelSmallAlert,
  ResolveLiverCancerRiskBigAlert,
}
