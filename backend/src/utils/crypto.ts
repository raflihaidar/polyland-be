import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

const { encodeBase64 } = naclUtil;

const generateBackendKeys = (): void => {
  const newKeyPair = nacl.box.keyPair();

  console.log("=== SIMPAN DI FILE .env ===");
  console.log("BACKEND_PRIVATE_KEY=" + encodeBase64(newKeyPair.secretKey));

  console.log("\n=== BAGIKAN KE FRONTEND ===");
  console.log(
    "NEXT_PUBLIC_BACKEND_PUBLIC_KEY=" + encodeBase64(newKeyPair.publicKey),
  );
};

generateBackendKeys();
