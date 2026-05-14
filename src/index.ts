import { inlineProjections } from '@event-driven-io/emmett'
import { configureEventStore } from './core/infrastructure/db.ts'
import { listen, register } from './core/infrastructure/server.ts'
import { liverCancerRiskProjection } from './alerting/monitor-liver-cancer-risk/projection.ts'
import { monitorLiverCancerRiskController } from './alerting/monitor-liver-cancer-risk/controller.ts'

configureEventStore({ projections: inlineProjections([liverCancerRiskProjection]) })
register(monitorLiverCancerRiskController)
listen()
