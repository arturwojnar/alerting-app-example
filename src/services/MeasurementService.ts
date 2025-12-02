import { MeasurementRepository } from '../repositories/MeasurementRepository.js'
import { UserRepository } from '../repositories/UserRepository.js'
import { Measurement, MeasurementType } from '../domain/Measurement.js'
import { AppDataSource } from '../core/infrastructure/database.js'
import { AlertService } from './AlertService.js'

export class MeasurementService {
  private measurementRepository: MeasurementRepository
  private userRepository: UserRepository
  private alertService: AlertService

  constructor() {
    this.measurementRepository = new MeasurementRepository()
    this.userRepository = new UserRepository()
    this.alertService = new AlertService()
  }

  async addMeasurement(
    userId: string,
    type: MeasurementType,
    value: number,
    measuredAt: Date = new Date(),
  ): Promise<Measurement> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new Error(`User with id ${userId} not found`)
    }

    // Create and save measurement
    const repository = AppDataSource.getRepository(Measurement)
    const measurement = repository.create({
      measurementType: type,
      value,
      measuredAt,
      user,
      userId: user.id,
    })
    const savedMeasurement = await repository.save(measurement)

    // Trigger alert checking
    await this.alertService.checkMeasurement(user, type, value)

    return savedMeasurement
  }

  async getMeasurementById(id: string): Promise<Measurement | null> {
    return await this.measurementRepository.findById(id)
  }

  async getMeasurementsByUserId(userId: string): Promise<Measurement[]> {
    return await this.measurementRepository.findByUserId(userId)
  }

  async getAllMeasurements(): Promise<Measurement[]> {
    return await this.measurementRepository.findAll()
  }

  async deleteMeasurement(id: string): Promise<void> {
    await this.measurementRepository.delete(id)
  }
}
