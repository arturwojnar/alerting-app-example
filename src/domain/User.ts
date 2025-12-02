import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm'
import { Measurement } from './Measurement.js'
import { Alert } from './Alert.js'

export enum UserRole {
  PATIENT = 'patient',
  MEDICAL_DOCTOR = 'medical_doctor',
}

export enum Sex {
  MALE = 'male',
  FEMALE = 'female',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role!: UserRole

  @Column({ type: 'date' })
  dateOfBirth!: Date

  @Column({
    type: 'enum',
    enum: Sex,
  })
  sex!: Sex

  @Column()
  race!: string

  @CreateDateColumn()
  createdAt!: Date

  @OneToMany(() => Measurement, (measurement) => measurement.user)
  measurements!: Measurement[]

  @OneToMany(() => Alert, (alert) => alert.user)
  alerts!: Alert[]
}
