import { AppDataSource } from '../core/infrastructure/database.js'
import { User } from '../domain/User.js'

export class UserRepository {
  private repository = AppDataSource.getRepository(User)

  async findById(id: string): Promise<User | null> {
    return await this.repository.findOne({ where: { id } })
  }

  async findAll(): Promise<User[]> {
    return await this.repository.find()
  }

  async save(user: User): Promise<User> {
    return await this.repository.save(user)
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id)
  }
}
