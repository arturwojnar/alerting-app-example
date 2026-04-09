import { pongoSingleStreamProjection } from '@event-driven-io/emmett-postgresql'
import type { PostgresReadEventMetadata } from '@event-driven-io/emmett-postgresql'
import type { ReadEvent } from '@event-driven-io/emmett'
import { assertNever } from '@chassisjs/hermes'
import type { PongoDocument } from '@event-driven-io/pongo'
import type { AlertEvent } from './event.js'

type SmallAlertRecord = {
  alertId: string
  kind: 'ALT' | 'FIBROSIS'
  value: number | string
  takenAt: string
}

type LiverCancerRiskSummary = PongoDocument & {
  patientId: string
  status: 'MONITORING' | 'BIG_ALERT_RAISED'
  smallAlerts: SmallAlertRecord[]
  bigAlert: { alertId: string; riskLevel: number; raisedAt: string } | null
}

const COLLECTION_NAME = 'liverCancerRiskSummary'
const STREAM_PREFIX = 'liverCancerRisk-'

const liverCancerRiskProjection = pongoSingleStreamProjection<
  LiverCancerRiskSummary,
  AlertEvent
>({
  canHandle: [
    'AltSmallAlertRaised',
    'FibrosisSmallAlertRaised',
    'LiverCancerRiskBigAlertRaised',
    'AltSmallAlertResolved',
    'FibrosisSmallAlertResolved',
    'LiverCancerRiskBigAlertResolved',
  ],
  collectionName: COLLECTION_NAME,
  getDocumentId: (event) => {
    const streamName = (event.metadata as unknown as { streamName: string })
      .streamName
    return streamName.slice(STREAM_PREFIX.length)
  },
  evolve: (
    doc: LiverCancerRiskSummary | null,
    event: ReadEvent<AlertEvent, PostgresReadEventMetadata>,
  ) => {
    const streamName = (event.metadata as unknown as { streamName: string })
      .streamName
    const patientId = streamName.slice(STREAM_PREFIX.length)
    const current: LiverCancerRiskSummary = doc ?? {
      patientId,
      status: 'MONITORING',
      smallAlerts: [],
      bigAlert: null,
    }

    switch (event.type) {
      case 'AltSmallAlertRaised': {
        const { data, metadata } = event
        return {
          ...current,
          smallAlerts: [
            ...current.smallAlerts,
            {
              alertId: metadata.alertId as string,
              kind: 'ALT' as const,
              value: data.value as number,
              takenAt: data.takenAt.toISOString(),
            },
          ],
        }
      }

      case 'FibrosisSmallAlertRaised': {
        const { data, metadata } = event
        return {
          ...current,
          smallAlerts: [
            ...current.smallAlerts,
            {
              alertId: metadata.alertId as string,
              kind: 'FIBROSIS' as const,
              value: data.value,
              takenAt: data.takenAt.toISOString(),
            },
          ],
        }
      }

      case 'LiverCancerRiskBigAlertRaised': {
        const { data, metadata } = event
        return {
          ...current,
          status: 'BIG_ALERT_RAISED' as const,
          bigAlert: {
            alertId: metadata.alertId as string,
            riskLevel: data.riskLevel,
            raisedAt: metadata.raisedAt.toISOString(),
          },
        }
      }

      case 'AltSmallAlertResolved': {
        const { metadata } = event
        return {
          ...current,
          smallAlerts: current.smallAlerts.filter(
            (a) => a.alertId !== (metadata.alertId as string),
          ),
        }
      }

      case 'FibrosisSmallAlertResolved': {
        const { metadata } = event
        return {
          ...current,
          smallAlerts: current.smallAlerts.filter(
            (a) => a.alertId !== (metadata.alertId as string),
          ),
        }
      }

      case 'LiverCancerRiskBigAlertResolved': {
        return {
          ...current,
          status: 'MONITORING' as const,
          smallAlerts: [],
          bigAlert: null,
        }
      }

      default:
        return assertNever(event)
    }
  },
})

export { liverCancerRiskProjection }
export type { LiverCancerRiskSummary }
