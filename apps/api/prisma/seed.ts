import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const categories = [
  ["Carpentry", "carpentry"],
  ["Electrical", "electrical"],
  ["Plumbing", "plumbing"],
  ["Welding", "welding"],
  ["Fashion & tailoring", "fashion-tailoring"],
  ["Painting", "painting"],
  ["Photography", "photography"],
  ["Beauty & care", "beauty-personal-care"],
  ["Cleaning services", "cleaning-services"],
  ["Construction", "construction"],
];

async function seed() {
  await prisma.$transaction(async (transaction) => {
    for (const [name, slug] of categories) {
      const category = await transaction.serviceCategory.upsert({
        where: { slug },
        create: { name, slug },
        update: { name, isActive: true },
      });
      await transaction.skill.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug } },
        create: { categoryId: category.id, name, slug },
        update: { name },
      });
    }
    await transaction.location.upsert({
      where: { id: "00000000-0000-4000-8000-000000000001" },
      create: {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Buea",
        city: "Buea",
        region: "South-West",
        isActive: true,
      },
      update: { isActive: true, city: "Buea", region: "South-West" },
    });
  });
  console.info("TrustTrade catalog seeded.");
}

seed()
  .catch((error: unknown) => {
    console.error("TrustTrade catalog seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
