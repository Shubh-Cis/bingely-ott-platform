// Admin user management: back-office Users (ADMIN/EDITOR) and customer Viewers,
// plus the audit-log feed. Used by the admin portal's User Management screens.
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { hashPassword } = require("../utils/password");
const { parsePagination } = require("../utils/pagination");

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, createdAt: u.createdAt });

// ---- Back-office users -----------------------------------------------------
async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return users.map(publicUser);
}

async function createUser({ email, password, name, role }) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw ApiError.conflict("A user with this email already exists");
  const u = await prisma.user.create({
    data: { email, name, role: role || "EDITOR", password: await hashPassword(password) },
  });
  return publicUser(u);
}

async function updateUser(id, data) {
  const patch = { ...data };
  if (data.password) patch.password = await hashPassword(data.password);
  const u = await prisma.user.update({ where: { id }, data: patch });
  return publicUser(u);
}

async function setUserActive(id, active) {
  const u = await prisma.user.update({ where: { id }, data: { active } });
  return publicUser(u);
}

async function deleteUser(id, requesterId) {
  if (id === requesterId) throw ApiError.badRequest("You cannot delete your own account");
  await prisma.user.delete({ where: { id } });
}

// ---- Customer viewers ------------------------------------------------------
async function listViewers(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = query.q
    ? { OR: [{ email: { contains: query.q, mode: "insensitive" } }, { name: { contains: query.q, mode: "insensitive" } }] }
    : {};
  const [items, total] = await Promise.all([
    prisma.viewer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, email: true, name: true, active: true, emailVerified: true, createdAt: true, subscription: { select: { plan: true, status: true } } },
    }),
    prisma.viewer.count({ where }),
  ]);
  return { items, page, pageSize, total };
}

async function getViewer(id) {
  const v = await prisma.viewer.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, active: true, emailVerified: true, createdAt: true,
      subscription: true,
      _count: { select: { favourites: true, devices: true, playbackProgress: true } },
    },
  });
  if (!v) throw ApiError.notFound("Viewer not found");
  return v;
}

async function setViewerActive(id, active) {
  await prisma.viewer.update({ where: { id }, data: { active } });
  return getViewer(id);
}

// ---- Audit log feed --------------------------------------------------------
async function auditLogs(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);
  return { items, page, pageSize, total };
}

module.exports = {
  listUsers, createUser, updateUser, setUserActive, deleteUser,
  listViewers, getViewer, setViewerActive, auditLogs,
};
