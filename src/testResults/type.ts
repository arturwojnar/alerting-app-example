import type { PositiveInteger } from '@chassisjs/hermes'
import type { Event, Flavour } from '@event-driven-io/emmett'

type PatientId = Flavour<string, 'PatientId'>

type AltLevel = Flavour<PositiveInteger, 'AltLevel'>
type FibrosisLevel = 'F0' | 'F1' | 'F2' | 'F3' | 'F4'
type AltTestResultRegistered = Event<
  'AltTestResultRegistered',
  { value: AltLevel },
  { patientId: PatientId }
>
type FibrosisLevelTestResultRegistered = Event<
  'FibrosisLevelTestResultRegistered',
  { value: FibrosisLevel },
  { patientId: PatientId }
>
type TestResultEvent =
  | AltTestResultRegistered
  | FibrosisLevelTestResultRegistered

export { type TestResultEvent }
