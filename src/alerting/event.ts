import type { Event } from '@event-driven-io/emmett'
import type {
  AlertId,
  AltLevel,
  DoctorId,
  FibrosisLevel,
  LiverCancerRiskLevelTresholdV1,
  LiverCancerRiskLevelV1,
  PatientId,
} from './type.ts'

type AltSmallAlertResolved = Event<
  'AltSmallAlertResolved',
  {},
  { alertId: AlertId; resolvedBy: DoctorId; timestamp: Date }
>
type FibrosisLevelSmallAlertResolved = Event<
  'FibrosisLevelSmallAlertResolved',
  {},
  { alertId: AlertId; resolvedBy: DoctorId; timestamp: Date }
>
type LiverCancerRiskBigAlertResolved = Event<
  'LiverCancerRiskBigAlertResolved',
  {},
  { alertId: AlertId; resolvedBy: DoctorId; timestamp: Date }
>
type AltSmallALertRaised = Event<
  'AltSmallALertRaised',
  { value: AltLevel; testTakenAt: Date },
  { alertId: AlertId }
>
type FibrosisLevelSmallALertRaised = Event<
  'FibrosisLevelSmallALertRaised',
  { value: FibrosisLevel; testTakenAt: Date },
  { alertId: AlertId }
>
type LiverCancerRiskBigAlert = Event<
  'LiverCancerRiskBigAlert',
  {
    riskLevel: LiverCancerRiskLevelV1
    riskLevelTreshold: LiverCancerRiskLevelTresholdV1
  },
  { alertId: AlertId; timestamp: Date }
>
type AlertEvent =
  | AltSmallAlertResolved
  | FibrosisLevelSmallAlertResolved
  | LiverCancerRiskBigAlertResolved
  | AltSmallALertRaised
  | FibrosisLevelSmallALertRaised
  | LiverCancerRiskBigAlert

export type {
  AlertEvent,
  AltSmallAlertResolved,
  FibrosisLevelSmallAlertResolved,
  LiverCancerRiskBigAlertResolved,
  AltSmallALertRaised,
  FibrosisLevelSmallALertRaised,
  LiverCancerRiskBigAlert,
}
