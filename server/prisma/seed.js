// Seed script: creates an initial admin User, default SiteSettings, and a few
// sample categories so the admin portal isn't empty on first boot.
// Run with:  npm run db:seed
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@bingely.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin12345";
  const name = process.env.SEED_ADMIN_NAME || "Bingely Admin";

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role: "ADMIN", password: await bcrypt.hash(password, 10) },
  });
  console.log(`✓ Admin user: ${admin.email} (password from SEED_ADMIN_PASSWORD)`);

  await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  console.log("✓ SiteSettings ensured");

  const categories = [
    { name: "Action", slug: "action", order: 1 },
    { name: "Drama", slug: "drama", order: 2 },
    { name: "Comedy", slug: "comedy", order: 3 },
    { name: "Sci-Fi", slug: "sci-fi", order: 4 },
    { name: "Documentary", slug: "documentary", order: 5 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log(`✓ ${categories.length} categories ensured`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
