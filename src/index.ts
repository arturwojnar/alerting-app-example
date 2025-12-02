import 'reflect-metadata'
import { listen } from './core/infrastructure/server.js'

listen().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
