import type { PongoDb, PongoDocument } from '@event-driven-io/pongo'
import type { PatientId } from './type.js'

type PatientContext = PongoDocument & {
  patientId: string
  gender: 'male' | 'female'
  dateOfBirth: string // ISO 8601 — age derived at decision time
}

const PATIENT_CONTEXT_COLLECTION = 'patientContexts'

// Stub: will be replaced by a projection consuming patient registration events
const getPatientContext = async (db: PongoDb, patientId: PatientId) =>
  db
    .collection<PatientContext>(PATIENT_CONTEXT_COLLECTION)
    .findOne({ patientId: patientId as string })

export type { PatientContext }
export { getPatientContext }
