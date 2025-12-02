import { AlertRepository } from '../repositories/AlertRepository.js'
import { MeasurementRepository } from '../repositories/MeasurementRepository.js'
import { Alert, AlertType } from '../domain/Alert.js'
import { User } from '../domain/User.js'
import { MeasurementType } from '../domain/Measurement.js'
import { AppDataSource } from '../core/infrastructure/database.js'

export class AlertService {
  private alertRepository: AlertRepository
  private measurementRepository: MeasurementRepository

  constructor() {
    this.alertRepository = new AlertRepository()
    this.measurementRepository = new MeasurementRepository()
  }

  async getAlertById(id: string): Promise<Alert | null> {
    return await this.alertRepository.findById(id)
  }

  async getAlertsByUserId(userId: string): Promise<Alert[]> {
    return await this.alertRepository.findByUserId(userId)
  }

  async getUnresolvedAlertsByUserId(userId: string): Promise<Alert[]> {
    return await this.alertRepository.findUnresolvedByUserId(userId)
  }

  async getAllAlerts(): Promise<Alert[]> {
    return await this.alertRepository.findAll()
  }

  // AC2-AC8: Check measurement and trigger alerts
  async checkMeasurement(
    user: User,
    type: MeasurementType,
    value: number,
  ): Promise<void> {
    // AC8: No new alerts if unresolved big alert exists
    const unresolvedBigAlert =
      await this.alertRepository.findUnresolvedBigAlertByUserId(user.id)

    if (unresolvedBigAlert) {
      console.log('Cannot generate new alerts - unresolved big alert exists')
      return
    }

    // AC2: Check ALT thresholds
    if (type === MeasurementType.ALT) {
      if (Alert.shouldTriggerAltAlert(value, user.sex)) {
        await this.raiseSmallAlert(user)
      }
    }

    // AC3: Check fibrosis levels F1-F4
    if (type === MeasurementType.FIBROSIS) {
      if (Alert.shouldTriggerFibrosisAlert(value)) {
        await this.raiseSmallAlert(user)
      }
    }

    // AC4: Check if big alert should be raised
    await this.checkIfBigAlertShouldBeRaised(user)
  }

  // Create a small alert
  private async raiseSmallAlert(user: User): Promise<Alert> {
    const repository = AppDataSource.getRepository(Alert)
    const alert = repository.create({
      type: AlertType.SMALL,
      user,
      userId: user.id,
    })
    return await repository.save(alert)
  }

  // AC4-AC5: Check if big alert should be raised based on measurements
  private async checkIfBigAlertShouldBeRaised(user: User): Promise<void> {
    // Get all measurements for the user
    const measurements = await this.measurementRepository.findByUserId(user.id)

    // Find alarming pairs
    const alarmingPairs = Alert.findAlarmingPairs(measurements, user)

    // Find valid consecutive pairs (at least 3, one month apart)
    const validPairs = Alert.findValidConsecutivePairs(alarmingPairs, 3)

    if (validPairs.length === 0) {
      return
    }

    // Calculate liver cancer risk
    const riskLevel = Alert.calculateLiverCancerRisk(validPairs, user)

    // AC5: Raise big alert if risk > 0.3
    if (Alert.shouldRaiseBigAlert(riskLevel)) {
      await this.raiseBigAlert(user)
    }
  }

  // Create a big alert
  private async raiseBigAlert(user: User): Promise<Alert> {
    const repository = AppDataSource.getRepository(Alert)

    // Check if big alert already exists
    const existingBigAlert =
      await this.alertRepository.findUnresolvedBigAlertByUserId(user.id)

    if (existingBigAlert) {
      return existingBigAlert
    }

    const alert = repository.create({
      type: AlertType.BIG,
      user,
      userId: user.id,
    })
    return await repository.save(alert)
  }

  // AC6-AC7: Resolve alert
  async resolveAlert(id: string): Promise<boolean> {
    const alert = await this.alertRepository.findById(id)
    if (!alert) {
      throw new Error(`Alert with id ${id} not found`)
    }

    const repository = AppDataSource.getRepository(Alert)

    // AC6: When resolving a big alert, resolve all small alerts
    if (alert.type === AlertType.BIG) {
      await repository.update(
        {
          userId: alert.userId,
          type: AlertType.SMALL,
          resolved: false,
        },
        { resolved: true },
      )

      alert.resolved = true
      await repository.save(alert)
      return true
    }

    // AC7: Small alerts cannot be resolved if a big alert exists
    if (alert.type === AlertType.SMALL) {
      const unresolvedBigAlert =
        await this.alertRepository.findUnresolvedBigAlertByUserId(alert.userId)

      if (unresolvedBigAlert) {
        console.log('Cannot resolve small alert - unresolved big alert exists')
        return false
      }

      alert.resolved = true
      await repository.save(alert)
      return true
    }

    return false
  }

  async deleteAlert(id: string): Promise<void> {
    await this.alertRepository.delete(id)
  }
}
