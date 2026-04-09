const fp = require('fastify-plugin')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})

async function prismaPlugin(fastify) {
  await prisma.$connect()
  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

module.exports = fp(prismaPlugin, { name: 'prisma' })
