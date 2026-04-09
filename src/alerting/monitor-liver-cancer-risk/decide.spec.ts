import { describe, expect, it } from '@jest/globals'
import { decide } from './decide.js'
import type {
  ResolveAltSmallAlert,
  ResolveLiverCancerRiskBigAlert,
} from './command.js'
import type { PatientContext } from './patientContext.js'
import type {
  AlertId,
  AltLevel,
  DoctorId,
  FibrosisLevel,
  LiverCancerRiskMonitor,
  PatientId,
} from './type.js'

const PATIENT_ID = 'p1' as unknown as PatientId
const DOCTOR_ID = 'd1' as unknown as DoctorId
const ALERT_ID = 'a1' as unknown as AlertId

const mockPatient: PatientContext = {
  patientId: 'p1',
  gender: 'male',
  dateOfBirth: '1970-01-01',
}

describe('decide: RaiseAlertsAfterAltResultRegistered', () => {
  it('raises AltSmallAlertRaised when ALT exceeds threshold for male (>45)', () => {
    const events = decide(
      {
        type: 'RaiseAlertsAfterAltResultRegistered',
        data: { value: 50 as unknown as AltLevel, testTakenAt: new Date() },
        metadata: { patientId: PATIENT_ID },
      },
      null,
      mockPatient,
    )
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('AltSmallAlertRaised')
  })

  it('returns no events when ALT is at or below threshold for male (<=45)', () => {
    const events = decide(
      {
        type: 'RaiseAlertsAfterAltResultRegistered',
        data: { value: 45 as unknown as AltLevel, testTakenAt: new Date() },
        metadata: { patientId: PATIENT_ID },
      },
      null,
      mockPatient,
    )
    expect(events).toHaveLength(0)
  })

  it('returns no events when status is BIG_ALERT_RAISED', () => {
    const bigAlertState: LiverCancerRiskMonitor = {
      status: 'BIG_ALERT_RAISED',
      pairs: [
        {
          alt: {
            alertId: ALERT_ID,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: ALERT_ID,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
        {
          alt: {
            alertId: ALERT_ID,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: ALERT_ID,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
        {
          alt: {
            alertId: ALERT_ID,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: ALERT_ID,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
      ],
      pendingAlt: null,
      pendingFibrosis: null,
      bigAlert: { alertId: ALERT_ID, riskLevel: 0.5, raisedAt: new Date() },
    }
    const events = decide(
      {
        type: 'RaiseAlertsAfterAltResultRegistered',
        data: { value: 50 as unknown as AltLevel, testTakenAt: new Date() },
        metadata: { patientId: PATIENT_ID },
      },
      bigAlertState,
      mockPatient,
    )
    expect(events).toHaveLength(0)
  })

  it('uses 35 U/L threshold for female patients', () => {
    const femalePatient: PatientContext = { ...mockPatient, gender: 'female' }
    const events = decide(
      {
        type: 'RaiseAlertsAfterAltResultRegistered',
        data: { value: 36 as unknown as AltLevel, testTakenAt: new Date() },
        metadata: { patientId: PATIENT_ID },
      },
      null,
      femalePatient,
    )
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('AltSmallAlertRaised')
  })
})

describe('decide: RaiseAlertsAfterFibrosisLevelRegistered', () => {
  it('raises FibrosisSmallAlertRaised for alarming levels (F1–F4)', () => {
    const events = decide(
      {
        type: 'RaiseAlertsAfterFibrosisLevelRegistered',
        data: { value: 'F2', testTakenAt: new Date() },
        metadata: { patientId: PATIENT_ID },
      },
      null,
      mockPatient,
    )
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('FibrosisSmallAlertRaised')
  })

  it('returns no events for F0', () => {
    const events = decide(
      {
        type: 'RaiseAlertsAfterFibrosisLevelRegistered',
        data: { value: 'F0', testTakenAt: new Date() },
        metadata: { patientId: PATIENT_ID },
      },
      null,
      mockPatient,
    )
    expect(events).toHaveLength(0)
  })
})

describe('decide: ResolveAltSmallAlert', () => {
  it('resolves when pending alt alert matches alertId', () => {
    const alertId = 'match-id' as unknown as AlertId
    const state: LiverCancerRiskMonitor = {
      status: 'MONITORING',
      pairs: [],
      pendingAlt: {
        alertId,
        value: 50 as unknown as AltLevel,
        takenAt: new Date(),
      },
      pendingFibrosis: null,
      bigAlert: null,
    }
    const command: ResolveAltSmallAlert = {
      type: 'ResolveAltSmallAlert',
      data: {},
      metadata: { patientId: PATIENT_ID, alertId, resolvedBy: DOCTOR_ID },
    }
    const events = decide(command, state, mockPatient)
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('AltSmallAlertResolved')
  })

  it('returns no events when alertId does not match', () => {
    const state: LiverCancerRiskMonitor = {
      status: 'MONITORING',
      pairs: [],
      pendingAlt: {
        alertId: 'other-id' as unknown as AlertId,
        value: 50 as unknown as AltLevel,
        takenAt: new Date(),
      },
      pendingFibrosis: null,
      bigAlert: null,
    }
    const command: ResolveAltSmallAlert = {
      type: 'ResolveAltSmallAlert',
      data: {},
      metadata: {
        patientId: PATIENT_ID,
        alertId: ALERT_ID,
        resolvedBy: DOCTOR_ID,
      },
    }
    expect(decide(command, state, mockPatient)).toHaveLength(0)
  })

  it('returns no events when BIG_ALERT_RAISED (AC4-resolve-small)', () => {
    const bigAlertState: LiverCancerRiskMonitor = {
      status: 'BIG_ALERT_RAISED',
      pairs: [
        {
          alt: {
            alertId: ALERT_ID,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: ALERT_ID,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
        {
          alt: {
            alertId: ALERT_ID,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: ALERT_ID,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
        {
          alt: {
            alertId: ALERT_ID,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: ALERT_ID,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
      ],
      pendingAlt: null,
      pendingFibrosis: null,
      bigAlert: { alertId: ALERT_ID, riskLevel: 0.5, raisedAt: new Date() },
    }
    const command: ResolveAltSmallAlert = {
      type: 'ResolveAltSmallAlert',
      data: {},
      metadata: {
        patientId: PATIENT_ID,
        alertId: ALERT_ID,
        resolvedBy: DOCTOR_ID,
      },
    }
    expect(decide(command, bigAlertState, mockPatient)).toHaveLength(0)
  })
})

describe('decide: ResolveLiverCancerRiskBigAlert', () => {
  it('emits 7 events (6 small resolved + big alert resolved) when alertId matches', () => {
    const bigAlertId = 'big-1' as unknown as AlertId
    const bigAlertState: LiverCancerRiskMonitor = {
      status: 'BIG_ALERT_RAISED',
      pairs: [
        {
          alt: {
            alertId: 'a1' as unknown as AlertId,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: 'f1' as unknown as AlertId,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
        {
          alt: {
            alertId: 'a2' as unknown as AlertId,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: 'f2' as unknown as AlertId,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
        {
          alt: {
            alertId: 'a3' as unknown as AlertId,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: 'f3' as unknown as AlertId,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
      ],
      pendingAlt: null,
      pendingFibrosis: null,
      bigAlert: { alertId: bigAlertId, riskLevel: 0.5, raisedAt: new Date() },
    }
    const command: ResolveLiverCancerRiskBigAlert = {
      type: 'ResolveLiverCancerRiskBigAlert',
      data: {},
      metadata: {
        patientId: PATIENT_ID,
        alertId: bigAlertId,
        resolvedBy: DOCTOR_ID,
      },
    }
    const events = decide(command, bigAlertState, mockPatient)
    expect(events).toHaveLength(7)
    expect(events.at(-1)?.type).toBe('LiverCancerRiskBigAlertResolved')
  })

  it('returns no events when alertId does not match', () => {
    const bigAlertState: LiverCancerRiskMonitor = {
      status: 'BIG_ALERT_RAISED',
      pairs: [
        {
          alt: {
            alertId: ALERT_ID,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: ALERT_ID,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
        {
          alt: {
            alertId: ALERT_ID,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: ALERT_ID,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
        {
          alt: {
            alertId: ALERT_ID,
            value: 50 as unknown as AltLevel,
            takenAt: new Date(),
          },
          fibrosis: {
            alertId: ALERT_ID,
            value: 'F2' as FibrosisLevel,
            takenAt: new Date(),
          },
        },
      ],
      pendingAlt: null,
      pendingFibrosis: null,
      bigAlert: {
        alertId: 'other-big' as unknown as AlertId,
        riskLevel: 0.5,
        raisedAt: new Date(),
      },
    }
    const command: ResolveLiverCancerRiskBigAlert = {
      type: 'ResolveLiverCancerRiskBigAlert',
      data: {},
      metadata: {
        patientId: PATIENT_ID,
        alertId: ALERT_ID,
        resolvedBy: DOCTOR_ID,
      },
    }
    expect(decide(command, bigAlertState, mockPatient)).toHaveLength(0)
  })
})
