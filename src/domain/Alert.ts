import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User, Sex } from './User.js'
import { Measurement, MeasurementType } from './Measurement.js'

export enum AlertType {
  SMALL = 'small',
  BIG = 'big',
}

export interface AlarmingPair {
  alt: Measurement
  fibrosis: Measurement
  date: Date
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  type!: AlertType

  @Column({ default: false })
  resolved!: boolean

  @ManyToOne(() => User, (user) => user.alerts)
  user!: User

  @Column()
  userId!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // AC2: Check if ALT value triggers alert
  static shouldTriggerAltAlert(value: number, sex: Sex): boolean {
    const threshold = sex === Sex.MALE ? 45 : 35
    return value > threshold
  }

  // AC3: Check if fibrosis value triggers alert
  static shouldTriggerFibrosisAlert(value: number): boolean {
    return value >= 1 && value <= 4
  }

  // AC4: Find alarming pairs from measurements
  static findAlarmingPairs(
    measurements: Measurement[],
    user: User,
  ): AlarmingPair[] {
    const alarmingPairs: AlarmingPair[] = []

    // Group measurements by date (same day)
    const measurementsByDate = new Map<string, Measurement[]>()
    for (const m of measurements) {
      const dateKey = m.measuredAt.toISOString().split('T')[0]
      if (!measurementsByDate.has(dateKey)) {
        measurementsByDate.set(dateKey, [])
      }
      measurementsByDate.get(dateKey)!.push(m)
    }

    // Find alarming pairs
    for (const dateMeasurements of measurementsByDate.values()) {
      const altMeasurement = dateMeasurements.find(
        (m) => m.measurementType === MeasurementType.ALT,
      )
      const fibrosisMeasurement = dateMeasurements.find(
        (m) => m.measurementType === MeasurementType.FIBROSIS,
      )

      if (altMeasurement && fibrosisMeasurement) {
        const isAltAlarming = Alert.shouldTriggerAltAlert(
          altMeasurement.value,
          user.sex,
        )
        const isFibrosisAlarming = Alert.shouldTriggerFibrosisAlert(
          fibrosisMeasurement.value,
        )

        if (isAltAlarming && isFibrosisAlarming) {
          alarmingPairs.push({
            alt: altMeasurement,
            fibrosis: fibrosisMeasurement,
            date: altMeasurement.measuredAt,
          })
        }
      }
    }

    return alarmingPairs
  }

  // AC4: Find valid consecutive pairs (at least one month apart)
  static findValidConsecutivePairs(
    alarmingPairs: AlarmingPair[],
    requiredCount: number = 3,
  ): AlarmingPair[] {
    if (alarmingPairs.length < requiredCount) {
      return []
    }

    // Sort by date descending
    const sorted = [...alarmingPairs].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    )

    const validPairs: AlarmingPair[] = []
    for (const pair of sorted) {
      if (validPairs.length === 0) {
        validPairs.push(pair)
      } else {
        const lastPair = validPairs[validPairs.length - 1]
        const daysDiff = Math.abs(
          (pair.date.getTime() - lastPair.date.getTime()) /
            (1000 * 60 * 60 * 24),
        )
        if (daysDiff >= 30) {
          validPairs.push(pair)
          if (validPairs.length === requiredCount) {
            break
          }
        }
      }
    }

    return validPairs.length === requiredCount ? validPairs : []
  }

  // AC4: Calculate liver cancer risk
  static calculateLiverCancerRisk(
    validPairs: AlarmingPair[],
    user: User,
  ): number {
    const age =
      (new Date().getTime() - user.dateOfBirth.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)

    const fibrosisValues = validPairs.map((p) => p.fibrosis.value)
    const medianFibrosis = fibrosisValues.sort((a, b) => a - b)[
      Math.floor(fibrosisValues.length / 2)
    ]

    const altValues = validPairs.map((p) => p.alt.value)
    const meanALT = altValues.reduce((sum, v) => sum + v, 0) / altValues.length
    const lastALT = validPairs[0].alt.value
    const firstALT = validPairs[validPairs.length - 1].alt.value

    return (age / 70) * (medianFibrosis / 4) * (meanALT / (lastALT + firstALT))
  }

  // AC5: Check if risk level requires big alert
  static shouldRaiseBigAlert(riskLevel: number): boolean {
    return riskLevel > 0.3
  }
}
