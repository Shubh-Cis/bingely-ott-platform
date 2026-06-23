// Customer (Viewer) account features: profile, favourites/My List, watch
// history + continue-watching, devices and notifications.
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { hashPassword, verifyPassword } = require("../utils/password");
const { shape: shapeTitle } = require("./title.service");

const titleInclude = { categories: { include: { category: true } } };

// ---- Profile ---------------------------------------------------------------
async function updateProfile(viewerId, { name }) {
  const v = await prisma.viewer.update({ where: { id: viewerId }, data: { name } });
  return { id: v.id, email: v.email, name: v.name };
}

async function changePassword(viewerId, { currentPassword, newPassword }) {
  const v = await prisma.viewer.findUnique({ where: { id: viewerId } });
  if (!v || !(await verifyPassword(currentPassword, v.password))) {
    throw ApiError.badRequest("Current password is incorrect");
  }
  await prisma.viewer.update({ where: { id: viewerId }, data: { password: await hashPassword(newPassword) } });
}

// ---- Favourites (My List) --------------------------------------------------
async function listFavourites(viewerId) {
  const rows = await prisma.favourite.findMany({
    where: { viewerId },
    orderBy: { createdAt: "desc" },
    include: { title: { include: titleInclude } },
  });
  return rows.map((r) => shapeTitle(r.title));
}

async function addFavourite(viewerId, titleId) {
  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title) throw ApiError.notFound("Title not found");
  await prisma.favourite.upsert({
    where: { viewerId_titleId: { viewerId, titleId } },
    update: {},
    create: { viewerId, titleId },
  });
  return listFavourites(viewerId);
}

async function removeFavourite(viewerId, titleId) {
  await prisma.favourite.deleteMany({ where: { viewerId, titleId } });
  return listFavourites(viewerId);
}

// ---- Watch history / continue watching -------------------------------------
// Upsert a resume point. episodeKey disambiguates movie vs each episode.
async function saveProgress(viewerId, { titleId, episodeId, kind = "MOVIE", positionSec, durationSec, completed }) {
  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title) throw ApiError.notFound("Title not found");
  const episodeKey = episodeId || "";
  const isComplete = completed ?? (durationSec > 0 && positionSec / durationSec >= 0.95);

  return prisma.playbackProgress.upsert({
    where: { viewerId_titleId_episodeKey: { viewerId, titleId, episodeKey } },
    update: { positionSec, durationSec, completed: isComplete, episodeId: episodeId || null, kind },
    create: { viewerId, titleId, episodeId: episodeId || null, episodeKey, kind, positionSec, durationSec, completed: isComplete },
  });
}

// The saved resume point for one title/episode (powers the "Resume vs Start
// over" prompt). Returns null if there's nothing saved.
async function getProgress(viewerId, { titleId, episodeId }) {
  if (!titleId) return null;
  const episodeKey = episodeId || "";
  return prisma.playbackProgress.findUnique({
    where: { viewerId_titleId_episodeKey: { viewerId, titleId, episodeKey } },
  });
}

async function continueWatching(viewerId) {
  const rows = await prisma.playbackProgress.findMany({
    where: { viewerId, completed: false, positionSec: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { title: { include: titleInclude } },
  });
  return rows.map((r) => ({
    progress: { positionSec: r.positionSec, durationSec: r.durationSec, episodeId: r.episodeId, kind: r.kind },
    title: shapeTitle(r.title),
  }));
}

async function watchHistory(viewerId) {
  const rows = await prisma.playbackProgress.findMany({
    where: { viewerId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { title: { include: titleInclude } },
  });
  return rows.map((r) => ({
    progress: { positionSec: r.positionSec, durationSec: r.durationSec, completed: r.completed, updatedAt: r.updatedAt },
    title: shapeTitle(r.title),
  }));
}

// ---- Devices ---------------------------------------------------------------
function listDevices(viewerId) {
  return prisma.device.findMany({ where: { viewerId }, orderBy: { lastSeenAt: "desc" } });
}
function registerDevice(viewerId, { name, type }) {
  return prisma.device.create({ data: { viewerId, name: name || "Web", type: type || "web" } });
}
async function removeDevice(viewerId, deviceId) {
  await prisma.device.deleteMany({ where: { id: deviceId, viewerId } });
  return listDevices(viewerId);
}

// ---- Notifications ---------------------------------------------------------
function listNotifications(viewerId) {
  return prisma.notification.findMany({ where: { viewerId }, orderBy: { createdAt: "desc" }, take: 50 });
}
async function markNotificationRead(viewerId, id) {
  await prisma.notification.updateMany({ where: { id, viewerId, readAt: null }, data: { readAt: new Date() } });
  return listNotifications(viewerId);
}

module.exports = {
  updateProfile,
  changePassword,
  listFavourites,
  addFavourite,
  removeFavourite,
  saveProgress,
  getProgress,
  continueWatching,
  watchHistory,
  listDevices,
  registerDevice,
  removeDevice,
  listNotifications,
  markNotificationRead,
};
