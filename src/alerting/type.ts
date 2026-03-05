import type { PositiveInteger } from '@chassisjs/hermes'
import type { DeepReadonly, Flavour } from '@event-driven-io/emmett'

type PatientId = Flavour<string, 'PatientId'>
type DoctorId = Flavour<string, 'DoctorId'>
type AlertId = Flavour<string, 'AlertId'>
type TestResultId = Flavour<string, 'TestResultId'>
type AltLevel = Flavour<PositiveInteger, 'AltLevel'>
type FibrosisLevel = 'F0' | 'F1' | 'F2' | 'F3' | 'F4'
type LiverCancerRiskLevelV1 = Flavour<number, 'LiverCancerRiskLevelV1'>
type LiverCancerRiskLevelTresholdV1 = Flavour<
  number,
  'LiverCancerRiskLevelTresholdV1'
>
type AltSmallAlert = DeepReadonly<{
  patientId: PatientId
  testResultId: TestResultId
  timestamp: Date
  value: AltLevel
}>
type FibrosisLevelSmallAlert = DeepReadonly<{
  patientId: PatientId
  testResultId: TestResultId
  timestamp: Date
  value: FibrosisLevel
}>
type LiverCancerRiskBigAlert = DeepReadonly<{
  patientId: PatientId
  testResultId: TestResultId
  timestamp: Date
  riskLevel: LiverCancerRiskLevelV1
  riskLevelTreshold: LiverCancerRiskLevelTresholdV1
}>
type SmallAlert = AltSmallAlert | FibrosisLevelSmallAlert
type BigAlert = LiverCancerRiskBigAlert

type PatientAlerts =
  | {
      smallAlert: [FibrosisLevelSmallAlert]
      bigAlert: null
    }
  | {
      smallAlert: [AltSmallAlert]
      bigAlert: null
    }
  | {
      smallAlert: [AltSmallAlert, FibrosisLevelSmallAlert]
      bigAlert: LiverCancerRiskBigAlert
    }

export type {
  PatientId,
  SmallAlert,
  BigAlert,
  LiverCancerRiskBigAlert,
  AltSmallAlert as AltSmallAlertForAlt,
  FibrosisLevelSmallAlert,
  TestResultId,
  AltLevel,
  FibrosisLevel,
  LiverCancerRiskLevelV1,
  LiverCancerRiskLevelTresholdV1,
  AlertId,
  DoctorId,
}

class InvalidAltLevel extends Error {}

const parseAltLevel = (value: number | string | PositiveInteger): AltLevel => {
  const altLevel = typeof value === 'string' ? parseFloat(value) : value

  if (
    typeof altLevel === 'undefined' ||
    isNaN(altLevel) ||
    Math.floor(altLevel) !== altLevel ||
    altLevel < 0 ||
    altLevel > 1e5
  ) {
    throw new InvalidAltLevel()
  }

  return altLevel
}
