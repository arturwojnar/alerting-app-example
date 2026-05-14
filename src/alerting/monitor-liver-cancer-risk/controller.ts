import type { FastifyPluginAsync } from 'fastify'
import { getEventStore, getPongoDb } from '../../core/infrastructure/db.js'
import type { PatientContext } from './patientContext.js'
import type { AlertId, AltLevel, DoctorId, FibrosisLevel, PatientId } from './type.js'
import {
  handleRaiseAlertsAfterAltResultRegistered,
  handleRaiseAlertsAfterFibrosisLevelRegistered,
  handleResolveAltSmallAlert,
  handleResolveFibrosisSmallAlert,
  handleResolveLiverCancerRiskBigAlert,
} from './handler.js'
import type { LiverCancerRiskSummary } from './projection.js'

const PATIENT_CONTEXT_COLLECTION = 'patientContexts'
const LIVER_CANCER_RISK_SUMMARY_COLLECTION = 'liverCancerRiskSummary'

const monitorLiverCancerRiskController: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: { patientId: string; gender: 'male' | 'female'; dateOfBirth: string }
  }>('/patients', async (request, reply) => {
    const { patientId, gender, dateOfBirth } = request.body
    await getPongoDb()
      .collection<PatientContext>(PATIENT_CONTEXT_COLLECTION)
      .handle(patientId, () => ({ patientId, gender, dateOfBirth }))
    return reply.code(201).send({ patientId })
  })

  fastify.post<{
    Params: { patientId: string }
    Body: { value: number; testTakenAt: string }
  }>('/patients/:patientId/measurements/alt', async (request, reply) => {
    const { patientId } = request.params
    const { value, testTakenAt } = request.body
    await handleRaiseAlertsAfterAltResultRegistered(getEventStore(), getPongoDb(), {
      type: 'RaiseAlertsAfterAltResultRegistered',
      data: { value: value as AltLevel, testTakenAt: new Date(testTakenAt) },
      metadata: { patientId: patientId as PatientId },
    })
    return reply.code(202).send()
  })

  fastify.post<{
    Params: { patientId: string }
    Body: { value: FibrosisLevel; testTakenAt: string }
  }>('/patients/:patientId/measurements/fibrosis', async (request, reply) => {
    const { patientId } = request.params
    const { value, testTakenAt } = request.body
    await handleRaiseAlertsAfterFibrosisLevelRegistered(getEventStore(), getPongoDb(), {
      type: 'RaiseAlertsAfterFibrosisLevelRegistered',
      data: { value, testTakenAt: new Date(testTakenAt) },
      metadata: { patientId: patientId as PatientId },
    })
    return reply.code(202).send()
  })

  fastify.patch<{
    Params: { patientId: string; alertId: string }
    Body: { resolvedBy: string }
  }>('/patients/:patientId/alerts/:alertId/alt/resolve', async (request, reply) => {
    const { patientId, alertId } = request.params
    const { resolvedBy } = request.body
    await handleResolveAltSmallAlert(getEventStore(), getPongoDb(), {
      type: 'ResolveAltSmallAlert',
      data: {},
      metadata: {
        patientId: patientId as PatientId,
        alertId: alertId as AlertId,
        resolvedBy: resolvedBy as DoctorId,
      },
    })
    return reply.code(204).send()
  })

  fastify.patch<{
    Params: { patientId: string; alertId: string }
    Body: { resolvedBy: string }
  }>('/patients/:patientId/alerts/:alertId/fibrosis/resolve', async (request, reply) => {
    const { patientId, alertId } = request.params
    const { resolvedBy } = request.body
    await handleResolveFibrosisSmallAlert(getEventStore(), getPongoDb(), {
      type: 'ResolveFibrosisSmallAlert',
      data: {},
      metadata: {
        patientId: patientId as PatientId,
        alertId: alertId as AlertId,
        resolvedBy: resolvedBy as DoctorId,
      },
    })
    return reply.code(204).send()
  })

  fastify.patch<{
    Params: { patientId: string; alertId: string }
    Body: { resolvedBy: string }
  }>('/patients/:patientId/alerts/:alertId/big/resolve', async (request, reply) => {
    const { patientId, alertId } = request.params
    const { resolvedBy } = request.body
    await handleResolveLiverCancerRiskBigAlert(getEventStore(), getPongoDb(), {
      type: 'ResolveLiverCancerRiskBigAlert',
      data: {},
      metadata: {
        patientId: patientId as PatientId,
        alertId: alertId as AlertId,
        resolvedBy: resolvedBy as DoctorId,
      },
    })
    return reply.code(204).send()
  })

  fastify.get<{
    Params: { patientId: string }
  }>('/patients/:patientId/liver-cancer-risk', async (request, reply) => {
    const { patientId } = request.params
    const summary = await getPongoDb()
      .collection<LiverCancerRiskSummary>(LIVER_CANCER_RISK_SUMMARY_COLLECTION)
      .findOne({ patientId })
    if (!summary) return reply.code(404).send({ message: 'No record found for patient' })
    return reply.send(summary)
  })
}

export { monitorLiverCancerRiskController }
