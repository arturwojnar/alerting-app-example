import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { User } from '../../domain/User.js'
import { Measurement } from '../../domain/Measurement.js'
import { Alert } from '../../domain/Alert.js'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] || 'localhost',
  port: Number(process.env['DB_PORT']) || 5432,
  username: process.env['DB_USERNAME'] || 'alerting',
  password: process.env['DB_PASSWORD'] || 'alerting',
  database: process.env['DB_NAME'] || 'alerting',
  synchronize: true, // Auto-create tables in dev (set to false in production)
  logging: false,
  entities: [User, Measurement, Alert],
})

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize()
    console.info('Database connection initialized successfully')
  } catch (error) {
    console.error('Error during database initialization:', error)
    throw error
  }
}
