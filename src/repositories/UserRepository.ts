import { AppDataSource } from '../core/infrastructure/database.js'
import { AlertType } from '../domain/Alert.js'
import { User, UserRole } from '../domain/User.js'

export class UserRepository {
  private repository = AppDataSource.getRepository(User)

  async findById(id: string): Promise<User | null> {
    return await this.repository.findOne({ where: { id } })
  }

  async findAll(): Promise<User[]> {
    return await this.repository.find()
  }

  async findPriorityPatients(): Promise<User[]> {
    return await this.repository
      .createQueryBuilder('user')
      .innerJoin(
        'user.alerts',
        'alert',
        'alert.type = :type AND alert.resolved = :resolved',
        { type: AlertType.BIG, resolved: false },
      )
      .where('user.role = :role', { role: UserRole.PATIENT })
      .orderBy('alert.createdAt', 'DESC')
      .getMany()
  }

  async save(user: User): Promise<User> {
    return await this.repository.save(user)
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id)
  }
}
