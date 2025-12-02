import Fastify from 'fastify'
import dotenv from 'dotenv'
import packageJson from '../../../package.json' with { type: 'json' }
import { initializeDatabase } from './database.js'
import { UserController } from '../../controllers/UserController.js'
import { MeasurementController } from '../../controllers/MeasurementController.js'
import { AlertController } from '../../controllers/AlertController.js'

dotenv.config()

const fastify = Fastify({
  logger: true,
})

fastify.get('/', async (_, reply) => {
  reply.type('application/json').code(200)
  return { version: packageJson.version }
})

// Initialize controllers
const userController = new UserController()
const measurementController = new MeasurementController()
const alertController = new AlertController()

// Register routes
userController.registerRoutes(fastify)
measurementController.registerRoutes(fastify)
alertController.registerRoutes(fastify)

export const getFastify = () => fastify

export const listen = async () => {
  try {
    // Initialize database before starting server
    await initializeDatabase()

    await fastify.listen(
      { port: Number(process.env['PORT'] || '3000') },
    )

    console.info(`Server is now listening on http://localhost:${process.env['PORT'] || '3000'}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
