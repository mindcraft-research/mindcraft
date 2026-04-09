// ─── SCHÉMAS DE VALIDATION ────────────────────────────────────────────────────

const createProjectSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
    },
  },
}

const updateProjectSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
      metadata: { type: 'object' },
    },
  },
}

const inviteSchema = {
  body: {
    type: 'object',
    required: ['email', 'role'],
    properties: {
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['EDITOR', 'VIEWER'] },
    },
  },
}

// ─── PLUGIN ROUTES ────────────────────────────────────────────────────────────

async function projectRoutes(fastify) {
  const { prisma } = fastify

  // Toutes les routes projets nécessitent d'être connecté
  fastify.addHook('onRequest', fastify.authenticate)

  // ── Lister mes projets ─────────────────────────────────────────────────────
  fastify.get('/', async (req, reply) => {
    const userId = req.user.id

    // Projets dont je suis propriétaire + projets où je suis collaborateur
    const [ownedProjects, collaborations] = await Promise.all([
      prisma.project.findMany({
        where: { ownerId: userId },
        include: {
          _count: { select: { collaborators: true, studies: true } },
          studies: { select: { id: true, status: true }, take: 5 },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.collaborator.findMany({
        where: { userId },
        include: {
          project: {
            include: {
              owner: { select: { id: true, username: true } },
              _count: { select: { collaborators: true, studies: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
    ])

    return reply.send({
      owned: ownedProjects,
      shared: collaborations.map((c) => ({ ...c.project, myRole: c.role })),
    })
  })

  // ── Créer un projet ────────────────────────────────────────────────────────
  fastify.post('/', { schema: createProjectSchema }, async (req, reply) => {
    const { name, description } = req.body
    const userId = req.user.id

    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: userId,
      },
      include: {
        owner: { select: { id: true, username: true } },
        _count: { select: { collaborators: true, studies: true } },
      },
    })

    await logActivity(prisma, userId, project.id, 'PROJECT_CREATED', `Projet "${name}" créé`)

    return reply.status(201).send({ project })
  })

  // ── Récupérer un projet ────────────────────────────────────────────────────
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params
    const userId = req.user.id

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, email: true } },
        collaborators: {
          include: { user: { select: { id: true, username: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        studies: { orderBy: { updatedAt: 'desc' } },
        activityLogs: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!project) return reply.status(404).send({ error: 'Projet introuvable.' })

    // Vérifier que l'utilisateur a accès au projet
    const hasAccess = await checkProjectAccess(prisma, id, userId)
    if (!hasAccess) return reply.status(403).send({ error: 'Accès refusé.' })

    // Déterminer le rôle de l'utilisateur dans ce projet
    const myRole =
      project.owner.id === userId
        ? 'OWNER'
        : project.collaborators.find((c) => c.user.id === userId)?.role || null

    return reply.send({ project, myRole })
  })

  // ── Modifier un projet ─────────────────────────────────────────────────────
  fastify.put('/:id', { schema: updateProjectSchema }, async (req, reply) => {
    const { id } = req.params
    const userId = req.user.id

    // Seul le propriétaire ou un éditeur peut modifier
    const access = await checkProjectAccess(prisma, id, userId, ['OWNER', 'EDITOR'])
    if (!access) return reply.status(403).send({ error: 'Accès refusé.' })

    const project = await prisma.project.update({
      where: { id },
      data: req.body,
      include: { owner: { select: { id: true, username: true } } },
    })

    await logActivity(prisma, userId, id, 'PROJECT_UPDATED', `Projet "${project.name}" modifié`)

    return reply.send({ project })
  })

  // ── Supprimer un projet ────────────────────────────────────────────────────
  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params
    const userId = req.user.id

    // Seul le propriétaire peut supprimer
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return reply.status(404).send({ error: 'Projet introuvable.' })
    if (project.ownerId !== userId) return reply.status(403).send({ error: 'Seul le propriétaire peut supprimer ce projet.' })

    await prisma.project.delete({ where: { id } })

    return reply.send({ message: 'Projet supprimé.' })
  })

  // ── Inviter un collaborateur ───────────────────────────────────────────────
  fastify.post('/:id/invite', { schema: inviteSchema }, async (req, reply) => {
    const { id } = req.params
    const { email, role } = req.body
    const userId = req.user.id

    // Seul le propriétaire peut inviter
    const project = await prisma.project.findUnique({
      where: { id },
      include: { owner: true },
    })
    if (!project) return reply.status(404).send({ error: 'Projet introuvable.' })
    if (project.ownerId !== userId) return reply.status(403).send({ error: 'Seul le propriétaire peut inviter des collaborateurs.' })

    // Vérifier que l'utilisateur invité existe
    const invitedUser = await prisma.user.findUnique({ where: { email } })
    if (!invitedUser) return reply.status(404).send({ error: 'Aucun compte trouvé avec cet email.' })

    // Vérifier qu'il n'est pas déjà collaborateur
    const alreadyCollab = await prisma.collaborator.findUnique({
      where: { userId_projectId: { userId: invitedUser.id, projectId: id } },
    })
    if (alreadyCollab) return reply.status(400).send({ error: 'Cet utilisateur est déjà collaborateur.' })

    // Créer ou renouveler l'invitation
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h

    const invitation = await prisma.invitation.upsert({
      where: { token: `${id}_${email}`.slice(0, 36) },
      create: { email, role, projectId: id, senderId: userId, expiresAt },
      update: { role, expiresAt, accepted: false },
    })

    // TODO: Envoyer l'email d'invitation (Phase suivante)
    fastify.log.info(`[DEV] Invitation créée pour ${email}, token: ${invitation.token}`)

    await logActivity(prisma, userId, id, 'COLLABORATOR_INVITED', `${email} invité comme ${role}`)

    return reply.status(201).send({
      message: `Invitation envoyée à ${email}.`,
      invitation: { id: invitation.id, email, role, expiresAt },
    })
  })

  // ── Accepter une invitation ────────────────────────────────────────────────
  fastify.post('/invitations/:token/accept', async (req, reply) => {
    const { token } = req.params
    const userId = req.user.id

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { project: true },
    })

    if (!invitation) return reply.status(404).send({ error: 'Invitation introuvable.' })
    if (invitation.accepted) return reply.status(400).send({ error: 'Invitation déjà acceptée.' })
    if (invitation.expiresAt < new Date()) return reply.status(400).send({ error: 'Invitation expirée.' })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user.email !== invitation.email) return reply.status(403).send({ error: 'Cette invitation ne vous est pas destinée.' })

    // Créer la collaboration et marquer l'invitation comme acceptée
    await prisma.$transaction([
      prisma.collaborator.create({
        data: { userId, projectId: invitation.projectId, role: invitation.role },
      }),
      prisma.invitation.update({ where: { token }, data: { accepted: true } }),
    ])

    await logActivity(prisma, userId, invitation.projectId, 'COLLABORATOR_JOINED', `${user.username} a rejoint le projet`)

    return reply.send({ message: 'Invitation acceptée.', projectId: invitation.projectId })
  })

  // ── Retirer un collaborateur ───────────────────────────────────────────────
  fastify.delete('/:id/collaborators/:collaboratorUserId', async (req, reply) => {
    const { id, collaboratorUserId } = req.params
    const userId = req.user.id

    // Propriétaire peut retirer n'importe qui, un collaborateur peut partir lui-même
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return reply.status(404).send({ error: 'Projet introuvable.' })

    const canRemove = project.ownerId === userId || collaboratorUserId === userId
    if (!canRemove) return reply.status(403).send({ error: 'Action non autorisée.' })

    await prisma.collaborator.delete({
      where: { userId_projectId: { userId: collaboratorUserId, projectId: id } },
    })

    await logActivity(prisma, userId, id, 'COLLABORATOR_REMOVED', `Collaborateur retiré du projet`)

    return reply.send({ message: 'Collaborateur retiré.' })
  })
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

async function checkProjectAccess(prisma, projectId, userId, allowedRoles = null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { collaborators: { where: { userId } } },
  })

  if (!project) return false
  if (project.ownerId === userId) return true

  const collab = project.collaborators[0]
  if (!collab) return false
  if (allowedRoles && !allowedRoles.includes(collab.role)) return false

  return true
}

async function logActivity(prisma, userId, projectId, action, details) {
  try {
    await prisma.activityLog.create({ data: { userId, projectId, action, details } })
  } catch {
    // Ne pas bloquer si le log échoue
  }
}

module.exports = projectRoutes
