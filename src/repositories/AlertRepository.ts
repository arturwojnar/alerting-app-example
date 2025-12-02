import { AppDataSource } from '../core/infrastructure/database.js'
import { Alert, AlertType } from '../domain/Alert.js'

export class AlertRepository {
  private repository = AppDataSource.getRepository(Alert)

  async findById(id: string): Promise<Alert | null> {
    return await this.repository.findOne({ where: { id } })
  }

  async findByUserId(userId: string): Promise<Alert[]> {
    return await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
  }

  async findUnresolvedByUserId(userId: string): Promise<Alert[]> {
    return await this.repository.find({
      where: { userId, resolved: false },
      order: { createdAt: 'DESC' },
    })
  }

  async findUnresolvedBigAlertByUserId(
    userId: string,
  ): Promise<Alert | null> {
    return await this.repository.findOne({
      where: { userId, type: AlertType.BIG, resolved: false },
    })
  }

  async findAll(): Promise<Alert[]> {
    return await this.repository.find()
  }

  async save(alert: Alert): Promise<Alert> {
    return await this.repository.save(alert)
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id)
  }
}
