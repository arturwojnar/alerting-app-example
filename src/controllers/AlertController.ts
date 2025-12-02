import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AlertService } from '../services/AlertService.js'

interface GetAlertParams {
  id: string
}

interface GetUserAlertsParams {
  userId: string
}

interface ResolveAlertBody {
  alertId: string
}

export class AlertController {
  private alertService: AlertService

  constructor() {
    this.alertService = new AlertService()
  }

  registerRoutes(fastify: FastifyInstance): void {
    fastify.get(
      '/alerts/:id',
      async (
        request: FastifyRequest<{ Params: GetAlertParams }>,
        reply: FastifyReply,
      ) => {
        try {
          const alert = await this.alertService.getAlertById(
            request.params.id,
          )
          if (!alert) {
            reply.code(404).send({ error: 'Alert not found' })
            return
          }
          reply.send(alert)
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )

    fastify.get(
      '/users/:userId/alerts',
      async (
        request: FastifyRequest<{ Params: GetUserAlertsParams }>,
        reply: FastifyReply,
      ) => {
        try {
          const alerts = await this.alertService.getAlertsByUserId(
            request.params.userId,
          )
          reply.send(alerts)
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )

    fastify.get(
      '/users/:userId/alerts/unresolved',
      async (
        request: FastifyRequest<{ Params: GetUserAlertsParams }>,
        reply: FastifyReply,
      ) => {
        try {
          const alerts =
            await this.alertService.getUnresolvedAlertsByUserId(
              request.params.userId,
            )
          reply.send(alerts)
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )

    fastify.get('/alerts', async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const alerts = await this.alertService.getAllAlerts()
        reply.send(alerts)
      } catch (error) {
        reply.code(500).send({ error: (error as Error).message })
      }
    })

    fastify.post(
      '/alerts/resolve',
      async (
        request: FastifyRequest<{ Body: ResolveAlertBody }>,
        reply: FastifyReply,
      ) => {
        try {
          const { alertId } = request.body
          const resolved = await this.alertService.resolveAlert(alertId)
          if (!resolved) {
            reply.code(400).send({
              error:
                'Cannot resolve alert. Small alerts cannot be resolved if a big alert exists.',
            })
            return
          }
          reply.send({ success: true, message: 'Alert resolved successfully' })
        } catch (error) {
          reply.code(400).send({ error: (error as Error).message })
        }
      },
    )

    fastify.delete(
      '/alerts/:id',
      async (
        request: FastifyRequest<{ Params: GetAlertParams }>,
        reply: FastifyReply,
      ) => {
        try {
          await this.alertService.deleteAlert(request.params.id)
          reply.code(204).send()
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )
  }
}
