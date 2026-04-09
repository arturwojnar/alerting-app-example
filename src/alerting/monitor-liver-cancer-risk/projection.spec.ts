import { describe, it, beforeAll, afterAll } from '@jest/globals'
import {
  PostgreSQLProjectionSpec,
  eventInStream,
  expectPongoDocuments,
} from '@event-driven-io/emmett-postgresql'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { liverCancerRiskProjection } from './projection.js'
import type { LiverCancerRiskSummary } from './projection.js'

const STREAM_NAME = 'liverCancerRisk-p1'
const PATIENT_ID = 'p1'
const ALERT_ID_ALT = 'alt-1'
const ALERT_ID_FIB = 'fib-1'
const ALERT_ID_BIG = 'big-1'
const DOCTOR_ID = 'doc-1'

let connectionString: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let container: any

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start()
  connectionString = container.getConnectionUri()
}, 60_000)

afterAll(async () => {
  await container?.stop()
})

describe('liverCancerRiskProjection: AltSmallAlertRaised', () => {
  it('adds a small ALT alert to the summary', async () => {
    const spec = PostgreSQLProjectionSpec.for({
      projection: liverCancerRiskProjection,
      connectionString,
    })

    const takenAt = new Date('2024-01-01T10:00:00Z')

    await spec([])
      .when([
        eventInStream(STREAM_NAME, {
          type: 'AltSmallAlertRaised',
          data: { value: 50, takenAt },
          metadata: { alertId: ALERT_ID_ALT, patientId: PATIENT_ID },
        }),
      ])
      .then(
        expectPongoDocuments
          .fromCollection<LiverCancerRiskSummary>('liverCancerRiskSummary')
          .withId(PATIENT_ID)
          .toBeEqual({
            _id: PATIENT_ID,
            patientId: PATIENT_ID,
            status: 'MONITORING',
            smallAlerts: [
              {
                alertId: ALERT_ID_ALT,
                kind: 'ALT',
                value: 50,
                takenAt: takenAt.toISOString(),
              },
            ],
            bigAlert: null,
          }),
      )
  })
})

describe('liverCancerRiskProjection: LiverCancerRiskBigAlertRaised', () => {
  it('sets status to BIG_ALERT_RAISED and stores the big alert', async () => {
    const spec = PostgreSQLProjectionSpec.for({
      projection: liverCancerRiskProjection,
      connectionString,
    })

    const takenAt = new Date('2024-01-01T10:00:00Z')
    const raisedAt = new Date('2024-04-01T10:00:00Z')

    await spec([
      eventInStream(STREAM_NAME, {
        type: 'AltSmallAlertRaised',
        data: { value: 50, takenAt },
        metadata: { alertId: ALERT_ID_ALT, patientId: PATIENT_ID },
      }),
      eventInStream(STREAM_NAME, {
        type: 'FibrosisSmallAlertRaised',
        data: { value: 'F2', takenAt },
        metadata: { alertId: ALERT_ID_FIB, patientId: PATIENT_ID },
      }),
    ])
      .when([
        eventInStream(STREAM_NAME, {
          type: 'LiverCancerRiskBigAlertRaised',
          data: { riskLevel: 0.42 },
          metadata: { alertId: ALERT_ID_BIG, patientId: PATIENT_ID, raisedAt },
        }),
      ])
      .then(
        expectPongoDocuments
          .fromCollection<LiverCancerRiskSummary>('liverCancerRiskSummary')
          .withId(PATIENT_ID)
          .toBeEqual({
            _id: PATIENT_ID,
            patientId: PATIENT_ID,
            status: 'BIG_ALERT_RAISED',
            smallAlerts: [
              {
                alertId: ALERT_ID_ALT,
                kind: 'ALT',
                value: 50,
                takenAt: takenAt.toISOString(),
              },
              {
                alertId: ALERT_ID_FIB,
                kind: 'FIBROSIS',
                value: 'F2',
                takenAt: takenAt.toISOString(),
              },
            ],
            bigAlert: {
              alertId: ALERT_ID_BIG,
              riskLevel: 0.42,
              raisedAt: raisedAt.toISOString(),
            },
          }),
      )
  })
})

describe('liverCancerRiskProjection: LiverCancerRiskBigAlertResolved', () => {
  it('resets status to MONITORING and clears all alerts', async () => {
    const spec = PostgreSQLProjectionSpec.for({
      projection: liverCancerRiskProjection,
      connectionString,
    })

    const raisedAt = new Date('2024-04-01T10:00:00Z')
    const resolvedAt = new Date('2024-05-01T10:00:00Z')

    await spec([
      eventInStream(STREAM_NAME, {
        type: 'LiverCancerRiskBigAlertRaised',
        data: { riskLevel: 0.42 },
        metadata: { alertId: ALERT_ID_BIG, patientId: PATIENT_ID, raisedAt },
      }),
    ])
      .when([
        eventInStream(STREAM_NAME, {
          type: 'LiverCancerRiskBigAlertResolved',
          data: {},
          metadata: {
            alertId: ALERT_ID_BIG,
            patientId: PATIENT_ID,
            resolvedBy: DOCTOR_ID,
            resolvedAt,
          },
        }),
      ])
      .then(
        expectPongoDocuments
          .fromCollection<LiverCancerRiskSummary>('liverCancerRiskSummary')
          .withId(PATIENT_ID)
          .toBeEqual({
            _id: PATIENT_ID,
            patientId: PATIENT_ID,
            status: 'MONITORING',
            smallAlerts: [],
            bigAlert: null,
          }),
      )
  })
})
