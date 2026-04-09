import type { Event } from '@event-driven-io/emmett'
import type {
  AlertId,
  AltLevel,
  DoctorId,
  FibrosisLevel,
  PatientId,
} from './type.js'

type AltSmallAlertRaised = Event<
  'AltSmallAlertRaised',
  { value: AltLevel; takenAt: Date },
  { alertId: AlertId; patientId: PatientId }
>

type FibrosisSmallAlertRaised = Event<
  'FibrosisSmallAlertRaised',
  { value: FibrosisLevel; takenAt: Date },
  { alertId: AlertId; patientId: PatientId }
>

type LiverCancerRiskBigAlertRaised = Event<
  'LiverCancerRiskBigAlertRaised',
  { riskLevel: number },
  { alertId: AlertId; patientId: PatientId; raisedAt: Date }
>

type AltSmallAlertResolved = Event<
  'AltSmallAlertResolved',
  Record<string, never>,
  {
    alertId: AlertId
    patientId: PatientId
    resolvedBy: DoctorId
    resolvedAt: Date
  }
>

type FibrosisSmallAlertResolved = Event<
  'FibrosisSmallAlertResolved',
  Record<string, never>,
  {
    alertId: AlertId
    patientId: PatientId
    resolvedBy: DoctorId
    resolvedAt: Date
  }
>

type LiverCancerRiskBigAlertResolved = Event<
  'LiverCancerRiskBigAlertResolved',
  Record<string, never>,
  {
    alertId: AlertId
    patientId: PatientId
    resolvedBy: DoctorId
    resolvedAt: Date
  }
>

type AlertEvent =
  | AltSmallAlertRaised
  | FibrosisSmallAlertRaised
  | LiverCancerRiskBigAlertRaised
  | AltSmallAlertResolved
  | FibrosisSmallAlertResolved
  | LiverCancerRiskBigAlertResolved

export type {
  AltSmallAlertRaised,
  FibrosisSmallAlertRaised,
  LiverCancerRiskBigAlertRaised,
  AltSmallAlertResolved,
  FibrosisSmallAlertResolved,
  LiverCancerRiskBigAlertResolved,
  AlertEvent,
}
