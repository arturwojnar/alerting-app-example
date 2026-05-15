import type { Command } from '@event-driven-io/emmett'
import type { PatientContext } from './patientContext.js'
import type {
  AlertId,
  AltLevel,
  DoctorId,
  FibrosisLevel,
  PatientId,
} from './type.js'

type RaiseAlertsAfterAltResultRegistered = Command<
  'RaiseAlertsAfterAltResultRegistered',
  { value: AltLevel; testTakenAt: Date },
  { patientId: PatientId; patient: PatientContext }
>

type RaiseAlertsAfterFibrosisLevelRegistered = Command<
  'RaiseAlertsAfterFibrosisLevelRegistered',
  { value: FibrosisLevel; testTakenAt: Date },
  { patientId: PatientId; patient: PatientContext }
>

type ResolveAltSmallAlert = Command<
  'ResolveAltSmallAlert',
  Record<string, never>,
  { patientId: PatientId; alertId: AlertId; resolvedBy: DoctorId }
>

type ResolveFibrosisSmallAlert = Command<
  'ResolveFibrosisSmallAlert',
  Record<string, never>,
  { patientId: PatientId; alertId: AlertId; resolvedBy: DoctorId }
>

type ResolveLiverCancerRiskBigAlert = Command<
  'ResolveLiverCancerRiskBigAlert',
  Record<string, never>,
  { patientId: PatientId; alertId: AlertId; resolvedBy: DoctorId }
>

type AlertCommand =
  | RaiseAlertsAfterAltResultRegistered
  | RaiseAlertsAfterFibrosisLevelRegistered
  | ResolveAltSmallAlert
  | ResolveFibrosisSmallAlert
  | ResolveLiverCancerRiskBigAlert

export type {
  RaiseAlertsAfterAltResultRegistered,
  RaiseAlertsAfterFibrosisLevelRegistered,
  ResolveAltSmallAlert,
  ResolveFibrosisSmallAlert,
  ResolveLiverCancerRiskBigAlert,
  AlertCommand,
}
