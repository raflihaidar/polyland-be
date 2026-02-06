import { prisma } from "../../config/prisma";
import { seedRoles } from "./role.seed";

const main = async () => {
  const args = process.argv.slice(2);
  const target = args[0];

  switch (target) {
    case "role":
      await seedRoles(prisma);
      break;
    default:
      console.log(
        "Please specify a valid seed target (roles, module, permissions)",
      );
  }
};

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
