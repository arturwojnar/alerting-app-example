import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { UserService } from '../services/UserService.js'
import { Sex, UserRole } from '../domain/User.js'

interface CreateUserBody {
  dateOfBirth: string
  sex: Sex
  race: string
  role?: UserRole
}

interface GetUserParams {
  id: string
}

export class UserController {
  private userService: UserService

  constructor() {
    this.userService = new UserService()
  }

  registerRoutes(fastify: FastifyInstance): void {
    fastify.post(
      '/users',
      async (
        request: FastifyRequest<{ Body: CreateUserBody }>,
        reply: FastifyReply,
      ) => {
        try {
          const { dateOfBirth, sex, race, role } = request.body
          const user = await this.userService.createUser(
            new Date(dateOfBirth),
            sex,
            race,
            role,
          )
          reply.code(201).send(user)
        } catch (error) {
          reply.code(400).send({ error: (error as Error).message })
        }
      },
    )

    fastify.get(
      '/users/:id',
      async (
        request: FastifyRequest<{ Params: GetUserParams }>,
        reply: FastifyReply,
      ) => {
        try {
          const user = await this.userService.getUserById(request.params.id)
          if (!user) {
            reply.code(404).send({ error: 'User not found' })
            return
          }
          reply.send(user)
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )

    fastify.get('/users', async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const users = await this.userService.getAllUsers()
        reply.send(users)
      } catch (error) {
        reply.code(500).send({ error: (error as Error).message })
      }
    })

    fastify.delete(
      '/users/:id',
      async (
        request: FastifyRequest<{ Params: GetUserParams }>,
        reply: FastifyReply,
      ) => {
        try {
          await this.userService.deleteUser(request.params.id)
          reply.code(204).send()
        } catch (error) {
          reply.code(500).send({ error: (error as Error).message })
        }
      },
    )
  }
}
