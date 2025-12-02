import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { MeasurementService } from '../services/MeasurementService.js'
import { MeasurementType } from '../domain/Measurement.js'

interface CreateMeasurementBody {
  userId: string
  type: MeasurementType
  value: number
  measuredAt?: string
}

interface GetMeasurementParams {
  id: string
}

interface GetUserMeasurementsParams {
  userId: string
}

export class MeasurementController {
  private measurementService: MeasurementService

  constructor() {
    this.measurementService = new MeasurementService()
  }

  registerRoutes(fastify: FastifyInstance): void {
    fastify.post(
      '/measurements',
      async (
        request: FastifyRequest<{ Body: CreateMeasurementBody }>,
        reply: FastifyReply,
      ) => {
        try {
          const { userId, type, value, measuredAt } = request.body
          const measurement = await this.measurementService.addMeasurement(
            userId,
            type,
            value,
            measuredAt ? new Date(measuredAt) : undefined,
          )
          reply.code(201).send(measurement)
        } catch (error) {
          reply.code(400).send({ error: (error as Error).message })
        }
      },
    )

    fastify.get(
      '/measurements/:id',
      async (
        request: FastifyRequest<{ Params: GetMeasurementParams }>,
        reply: FastifyReply,
      ) => {
        try {
          const measurement =
            await this.measurementService.getMeasurementById(
              request.params.id,
            )
          if (!measurement) {
            reply.code(404).send({ error: 'Measurement not found' })
            return
          }
          reply.send(measurement)
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )

    fastify.get(
      '/users/:userId/measurements',
      async (
        request: FastifyRequest<{ Params: GetUserMeasurementsParams }>,
        reply: FastifyReply,
      ) => {
        try {
          const measurements =
            await this.measurementService.getMeasurementsByUserId(
              request.params.userId,
            )
          reply.send(measurements)
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )

    fastify.get(
      '/measurements',
      async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
          const measurements =
            await this.measurementService.getAllMeasurements()
          reply.send(measurements)
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )

    fastify.delete(
      '/measurements/:id',
      async (
        request: FastifyRequest<{ Params: GetMeasurementParams }>,
        reply: FastifyReply,
      ) => {
        try {
          await this.measurementService.deleteMeasurement(request.params.id)
          reply.code(204).send()
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )
  }
}
