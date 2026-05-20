import { prisma } from "../../config/prisma.js";
import { seedRoles } from "./role.seed.js";
import { seedModules } from "./module.seed.js";
import { seedRolePrivileges } from "./role-privilege.seed.js";
import { landOfficeModules } from "./landOffice.seed.js";
import { districtModule } from "./district.seed.js";
import { villageModule } from "./village.seed.js";
import { landCertificateModule } from "./land-certificate.seed.js";

const main = async () => {
  const args = process.argv.slice(2);
  const target = args[0];

  console.log("target : ", target);

  switch (target) {
    case "role":
      await seedRoles(prisma);
      break;
    case "module":
      await seedModules(prisma);
      break;
    case "role-privilege":
      await seedRolePrivileges(prisma);
      break;
    case "land-office":
      await landOfficeModules(prisma);
      break;
    case "district":
      await districtModule(prisma);
      break;
    case "village":
      await villageModule(prisma);
      break;
    case "land-certificate":
      await landCertificateModule(prisma);
      break;
    default:
      console.log(
        "Please specify a valid seed target (role, module, permissions, district, village)",
      );
  }
};

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
