import Pulsar from 'pulsar-client'
import type {
  Consumer,
  ConsumerConfig,
  Message,
  MessageId,
  Producer,
  ProducerConfig,
  ProducerMessage,
} from 'pulsar-client'
import dotenv from 'dotenv'

dotenv.config()

export type SendOptions = Omit<ProducerMessage, 'data'>

export type MessageHandler<T> = (
  message: T,
  raw: Message,
) => Promise<void> | void

export type SubscribeOptions = Omit<
  ConsumerConfig,
  'topic' | 'topics' | 'topicsPattern' | 'subscription' | 'listener'
>

export type ReceivedMessage<T> = {
  data: T
  raw: Message
  ack: () => Promise<null>
  nack: () => void
}

let client: Pulsar.Client | null = null
const producers = new Map<string, Promise<Producer>>()

export const getPulsarClient = () => {
  if (!client) {
    client = new Pulsar.Client({
      serviceUrl: process.env['PULSAR_URL'] || 'pulsar://localhost:6650',
      operationTimeoutSeconds: 30,
    })
  }

  return client
}

const serialize = <T>(message: T): Buffer =>
  Buffer.from(JSON.stringify(message))

const deserialize = <T>(raw: Message): T =>
  JSON.parse(raw.getData().toString()) as T

const getProducer = (topic: string, config?: Omit<ProducerConfig, 'topic'>) => {
  let producer = producers.get(topic)

  if (!producer) {
    producer = getPulsarClient().createProducer({ topic, ...config })
    producer.catch(() => producers.delete(topic))
    producers.set(topic, producer)
  }

  return producer
}

export const sendMessage = async <T>(
  topic: string,
  message: T,
  options?: SendOptions,
): Promise<MessageId> => {
  const producer = await getProducer(topic)

  return producer.send({ ...options, data: serialize(message) })
}

export const createSender =
  <T>(topic: string) =>
  (message: T, options?: SendOptions) =>
    sendMessage<T>(topic, message, options)

/**
 * Push-based consumption. The message is acknowledged when the handler resolves
 * and negatively acknowledged (redelivered) when it throws.
 */
export const subscribe = <T>(
  topic: string,
  subscription: string,
  handler: MessageHandler<T>,
  options?: SubscribeOptions,
): Promise<Consumer> =>
  getPulsarClient().subscribe({
    subscriptionType: 'Shared',
    subscriptionInitialPosition: 'Earliest',
    ...options,
    topic,
    subscription,
    listener: async (raw, consumer) => {
      try {
        await handler(deserialize<T>(raw), raw)
        await consumer.acknowledge(raw)
      } catch (error) {
        console.error(
          `Failed to handle message ${raw.getMessageId().toString()} from ${topic}`,
          error,
        )
        consumer.negativeAcknowledge(raw)
      }
    },
  })

/**
 * Pull-based consumption. Create a consumer with `createConsumer`
 * and call `receiveMessage` on it. Acknowledging is up to the caller.
 */
export const createConsumer = (
  topic: string,
  subscription: string,
  options?: SubscribeOptions,
): Promise<Consumer> =>
  getPulsarClient().subscribe({
    subscriptionType: 'Shared',
    subscriptionInitialPosition: 'Earliest',
    ...options,
    topic,
    subscription,
  })

export const receiveMessage = async <T>(
  consumer: Consumer,
  timeoutMs?: number,
): Promise<ReceivedMessage<T>> => {
  const raw = await consumer.receive(timeoutMs)

  return {
    data: deserialize<T>(raw),
    raw,
    ack: () => consumer.acknowledge(raw),
    nack: () => consumer.negativeAcknowledge(raw),
  }
}

export const closePulsar = async () => {
  const pending = [...producers.values()]
  producers.clear()

  await Promise.allSettled(
    pending.map((producer) => producer.then((p) => p.close())),
  )

  if (client) {
    await client.close()
    client = null
  }
}
