// Analytics: ingest anonymous playback events and aggregate them (plus users,
// subscriptions, revenue and catalog counts) for the admin dashboard.
const prisma = require("../config/prisma");

// ---- Ingestion (public, anonymous) ----------------------------------------
async function recordEvent({ titleId, episodeId, type, kind, sessionId, seconds, position }) {
  return prisma.playbackEvent.create({
    data: {
      titleId: titleId || null,
      episodeId: episodeId || null,
      type,
      kind: kind || null,
      sessionId,
      seconds: seconds || 0,
      position: position || 0,
    },
  });
}

// ---- Dashboard headline numbers --------------------------------------------
async function dashboard(windowDays = 7) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [
    totalViewers,
    totalUsers,
    movies,
    series,
    documentaries,
    totalEpisodes,
    activeSubscriptions,
    totalViews,
    watchSecondsAgg,
    revenueAgg,
    recentActivity,
    // today
    newViewersToday,
    viewsToday,
    sessionsToday,
    watchSecondsToday,
    // window
    newViewersWindow,
    viewsWindow,
    revenueWindowAgg,
  ] = await Promise.all([
    prisma.viewer.count(),
    prisma.user.count(),
    prisma.title.count({ where: { type: "MOVIE" } }),
    prisma.title.count({ where: { type: "SERIES" } }),
    prisma.title.count({ where: { type: "DOCUMENTARY" } }),
    prisma.episode.count(),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.playbackEvent.count({ where: { type: "START" } }),
    prisma.playbackEvent.aggregate({ _sum: { seconds: true } }),
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: "SUCCEEDED" } }),
    prisma.auditLog.findMany({ take: 10, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }),
    prisma.viewer.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.playbackEvent.count({ where: { type: "START", createdAt: { gte: startOfToday } } }),
    prisma.playbackEvent.groupBy({ by: ["sessionId"], where: { createdAt: { gte: startOfToday } } }),
    prisma.playbackEvent.aggregate({ _sum: { seconds: true }, where: { createdAt: { gte: startOfToday } } }),
    prisma.viewer.count({ where: { createdAt: { gte: windowStart } } }),
    prisma.playbackEvent.count({ where: { type: "START", createdAt: { gte: windowStart } } }),
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: "SUCCEEDED", createdAt: { gte: windowStart } } }),
  ]);

  return {
    totalViewers,
    totalUsers,
    titles: { movies, series, documentaries, total: movies + series + documentaries },
    totalEpisodes,
    activeSubscriptions,
    totalViews,
    watchHours: Math.round((watchSecondsAgg._sum.seconds || 0) / 360) / 10,
    revenueCents: revenueAgg._sum.amountCents || 0,
    recentActivity,
    today: {
      activeCustomers: sessionsToday.length, // distinct viewing sessions today
      newViewers: newViewersToday,
      views: viewsToday,
      watchHours: Math.round((watchSecondsToday._sum.seconds || 0) / 360) / 10,
    },
    window: {
      days: windowDays,
      newViewers: newViewersWindow,
      views: viewsWindow,
      revenueCents: revenueWindowAgg._sum.amountCents || 0,
    },
  };
}

// ---- Most-watched titles (by START events) ---------------------------------
async function mostWatched(limit = 10) {
  const grouped = await prisma.playbackEvent.groupBy({
    by: ["titleId"],
    where: { type: "START", titleId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { titleId: "desc" } },
    take: limit,
  });
  const titles = await prisma.title.findMany({
    where: { id: { in: grouped.map((g) => g.titleId) } },
    select: { id: true, title: true, type: true, posterUrl: true },
  });
  const byId = Object.fromEntries(titles.map((t) => [t.id, t]));
  return grouped.map((g) => ({ ...byId[g.titleId], views: g._count._all }));
}

// ---- Time series (raw SQL with date_trunc) ---------------------------------
async function watchTime(days = 30) {
  return prisma.$queryRaw`
    SELECT date_trunc('day', "createdAt")::date AS day,
           COALESCE(SUM("seconds"), 0)::int AS seconds
    FROM "PlaybackEvent"
    WHERE "createdAt" >= NOW() - (${days} || ' days')::interval
    GROUP BY day ORDER BY day ASC`;
}

async function userGrowth(days = 30) {
  return prisma.$queryRaw`
    SELECT date_trunc('day', "createdAt")::date AS day,
           COUNT(*)::int AS signups
    FROM "Viewer"
    WHERE "createdAt" >= NOW() - (${days} || ' days')::interval
    GROUP BY day ORDER BY day ASC`;
}

async function revenue(months = 12) {
  return prisma.$queryRaw`
    SELECT date_trunc('month', "createdAt")::date AS month,
           COALESCE(SUM("amountCents"), 0)::int AS cents
    FROM "Payment"
    WHERE "status" = 'SUCCEEDED'
      AND "createdAt" >= NOW() - (${months} || ' months')::interval
    GROUP BY month ORDER BY month ASC`;
}

// ---- Subscription breakdown ------------------------------------------------
async function subscriptionBreakdown() {
  const [byPlan, byStatus] = await Promise.all([
    prisma.subscription.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    byPlan: byPlan.map((p) => ({ plan: p.plan || "NONE", count: p._count._all })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
  };
}

module.exports = { recordEvent, dashboard, mostWatched, watchTime, userGrowth, revenue, subscriptionBreakdown };
