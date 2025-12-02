import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm'
import { User } from './User.js'

export enum MeasurementType {
  ALT = 'ALT',
  FIBROSIS = 'FIBROSIS',
}

@Entity('measurements')
export class Measurement {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({
    type: 'enum',
    enum: MeasurementType,
  })
  measurementType!: MeasurementType

  @Column({ type: 'float' })
  value!: number

  @Column({ type: 'timestamp' })
  measuredAt!: Date

  @ManyToOne(() => User, (user) => user.measurements)
  user!: User

  @Column()
  userId!: string

  @CreateDateColumn()
  createdAt!: Date
}
