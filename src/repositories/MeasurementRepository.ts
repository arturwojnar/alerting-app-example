import { AppDataSource } from '../core/infrastructure/database.js'
import { Measurement } from '../domain/Measurement.js'

export class MeasurementRepository {
  private repository = AppDataSource.getRepository(Measurement)

  async findById(id: string): Promise<Measurement | null> {
    return await this.repository.findOne({ where: { id } })
  }

  async findByUserId(userId: string): Promise<Measurement[]> {
    return await this.repository.find({
      where: { userId },
      order: { measuredAt: 'DESC' },
    })
  }

  async findAll(): Promise<Measurement[]> {
    return await this.repository.find()
  }

  async save(measurement: Measurement): Promise<Measurement> {
    return await this.repository.save(measurement)
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id)
  }
}
