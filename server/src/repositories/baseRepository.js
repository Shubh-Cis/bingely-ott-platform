// A tiny repository factory. Each model gets a thin data-access object so
// services never touch the Prisma client directly. Domain rules (slugs,
// relations, ordering) live in the services; raw persistence lives here.
const prisma = require("../config/prisma");

function createRepository(modelName) {
  const model = prisma[modelName];
  if (!model) throw new Error(`Unknown Prisma model: ${modelName}`);

  return {
    model, // escape hatch for model-specific queries in services
    findById: (id, args = {}) => model.findUnique({ where: { id }, ...args }),
    findUnique: (where, args = {}) => model.findUnique({ where, ...args }),
    findFirst: (args = {}) => model.findFirst(args),
    findMany: (args = {}) => model.findMany(args),
    count: (where = {}) => model.count({ where }),
    create: (data, args = {}) => model.create({ data, ...args }),
    update: (id, data, args = {}) => model.update({ where: { id }, data, ...args }),
    delete: (id) => model.delete({ where: { id } }),
    // List + total in one round-trip, for paginated endpoints.
    paginate: async ({ where = {}, orderBy, skip, take, include, select }) => {
      const [items, total] = await Promise.all([
        model.findMany({ where, orderBy, skip, take, include, select }),
        model.count({ where }),
      ]);
      return { items, total };
    },
  };
}

module.exports = { createRepository };
