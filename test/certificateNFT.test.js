import { expect } from "chai";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("mintCertificate", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("should mint NFT certificate", async function () {
    const certificateContract = await viem.deployContract("CertificateNFT");

    const recipient = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

    // 3. Panggil fungsi write pada kontrak yang baru saja di-deploy
    const hash = await certificateContract.write.mintCertificate([recipient]);

    // 4. Tunggu receipt transaksi
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // 5. Validasi status transaksi
    expect(receipt.status).to.equal("success");
  });
});
