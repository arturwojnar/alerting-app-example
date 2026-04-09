import { assertNever, literalObject } from '@chassisjs/hermes'
import type { AlertEvent } from './event.js'
import type {
  AlertPair,
  AltSmallAlertState,
  FibrosisSmallAlertState,
  LiverCancerRiskMonitor,
} from './type.js'

const MONITORING_INITIAL: LiverCancerRiskMonitor = {
  status: 'MONITORING',
  pairs: [],
  pendingAlt: null,
  pendingFibrosis: null,
  bigAlert: null,
}

const initialState = () => null as LiverCancerRiskMonitor | null

const evolve = (state: LiverCancerRiskMonitor | null, event: AlertEvent) => {
  switch (event.type) {
    case 'AltSmallAlertRaised': {
      const { data, metadata } = event
      const current = state ?? MONITORING_INITIAL
      if (current.status === 'BIG_ALERT_RAISED') return current

      const newAlt: AltSmallAlertState = {
        alertId: metadata.alertId,
        value: data.value,
        takenAt: data.takenAt,
      }

      if (current.pendingFibrosis !== null) {
        const newPair: AlertPair = {
          alt: newAlt,
          fibrosis: current.pendingFibrosis,
        }
        return literalObject<LiverCancerRiskMonitor>({
          status: 'MONITORING',
          pairs: [...current.pairs, newPair],
          pendingAlt: null,
          pendingFibrosis: null,
          bigAlert: null,
        })
      }

      return literalObject<LiverCancerRiskMonitor>({
        status: 'MONITORING',
        pairs: current.pairs,
        pendingAlt: newAlt,
        pendingFibrosis: current.pendingFibrosis,
        bigAlert: null,
      })
    }

    case 'FibrosisSmallAlertRaised': {
      const { data, metadata } = event
      const current = state ?? MONITORING_INITIAL
      if (current.status === 'BIG_ALERT_RAISED') return current

      const newFibrosis: FibrosisSmallAlertState = {
        alertId: metadata.alertId,
        value: data.value,
        takenAt: data.takenAt,
      }

      if (current.pendingAlt !== null) {
        const newPair: AlertPair = {
          alt: current.pendingAlt,
          fibrosis: newFibrosis,
        }
        return literalObject<LiverCancerRiskMonitor>({
          status: 'MONITORING',
          pairs: [...current.pairs, newPair],
          pendingAlt: null,
          pendingFibrosis: null,
          bigAlert: null,
        })
      }

      return literalObject<LiverCancerRiskMonitor>({
        status: 'MONITORING',
        pairs: current.pairs,
        pendingAlt: current.pendingAlt,
        pendingFibrosis: newFibrosis,
        bigAlert: null,
      })
    }

    case 'LiverCancerRiskBigAlertRaised': {
      const { data, metadata } = event
      if (!state || state.status !== 'MONITORING') return state
      const pairs = state.pairs as [AlertPair, AlertPair, AlertPair]
      return literalObject<LiverCancerRiskMonitor>({
        status: 'BIG_ALERT_RAISED',
        pairs,
        pendingAlt: null,
        pendingFibrosis: null,
        bigAlert: {
          alertId: metadata.alertId,
          riskLevel: data.riskLevel,
          raisedAt: metadata.raisedAt,
        },
      })
    }

    case 'AltSmallAlertResolved': {
      if (!state || state.status === 'BIG_ALERT_RAISED') return state
      return literalObject<LiverCancerRiskMonitor>({
        status: 'MONITORING',
        pairs: state.pairs,
        pendingAlt: null,
        pendingFibrosis: state.pendingFibrosis,
        bigAlert: null,
      })
    }

    case 'FibrosisSmallAlertResolved': {
      if (!state || state.status === 'BIG_ALERT_RAISED') return state
      return literalObject<LiverCancerRiskMonitor>({
        status: 'MONITORING',
        pairs: state.pairs,
        pendingAlt: state.pendingAlt,
        pendingFibrosis: null,
        bigAlert: null,
      })
    }

    case 'LiverCancerRiskBigAlertResolved': {
      return literalObject<LiverCancerRiskMonitor>({
        status: 'MONITORING',
        pairs: [],
        pendingAlt: null,
        pendingFibrosis: null,
        bigAlert: null,
      })
    }

    default:
      return assertNever(event)
  }
}

export { evolve, initialState }
