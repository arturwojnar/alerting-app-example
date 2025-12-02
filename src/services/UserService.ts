import { UserRepository } from '../repositories/UserRepository.js'
import { User, Sex, UserRole } from '../domain/User.js'
import { AppDataSource } from '../core/infrastructure/database.js'

export class UserService {
  private userRepository: UserRepository

  constructor() {
    this.userRepository = new UserRepository()
  }

  async createUser(
    dateOfBirth: Date,
    sex: Sex,
    race: string,
    role: UserRole = UserRole.PATIENT,
  ): Promise<User> {
    const repository = AppDataSource.getRepository(User)
    const user = repository.create({
      dateOfBirth,
      sex,
      race,
      role,
    })
    return await repository.save(user)
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.userRepository.findById(id)
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.findAll()
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id)
  }
}
