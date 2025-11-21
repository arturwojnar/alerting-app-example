import Fastify from 'fastify'
import dotenv from 'dotenv'
import packageJson from '../../../package.json' with { type: 'json' }

dotenv.config()

const fastify = Fastify({
  logger: true,
})

fastify.get('/', async (_, reply) => {
  reply.type('application/json').code(200)
  return { version: packageJson.version }
})

export const getFastify = () => fastify

export const listen = () =>
  fastify.listen(
    { port: Number(process.env['PORT'] || '3000') },
    (err, address) => {
      if (err) {
        throw err
      }

      console.info(`Server is now listening on ${address}`)
    },
  )
