import path from "path";
import { DocumentType, ApplicantRole } from "../generated/prisma/enums.js";

export const mapApplicationDocuments = (applicationId: string, data: any) => {
  const docs: any[] = [];

  const baseFolder = `applications/${applicationId}`;

  const buildFileFields = (file: any) => ({
    fileUrl: `${baseFolder}/${path.basename(file.path)}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
  });

  const pushSingle = (file: any, type: DocumentType) => {
    if (!file) return;

    docs.push({
      application_id: applicationId,
      person_id: null,
      type,
      ...buildFileFields(file),
    });
  };

  const pushArrayWithPerson = (
    items: any[],
    type: DocumentType,
    role: ApplicantRole,
  ) => {
    if (!items?.length) return;

    items.forEach((item, index) => {
      if (!item.file) return;
      if (!item.person_id) {
        throw new Error(
          `person_id kosong untuk dokumen ${type} pada index ${index}. ` +
            `Pastikan Person sudah di-upsert sebelum memanggil mapApplicationDocuments.`,
        );
      }

      docs.push({
        application_id: applicationId,
        person_id: item.person_id,
        role,
        type,
        ...buildFileFields(item.file),
      });
    });
  };

  // ─── Dokumen level-aplikasi (satu file, tidak terkait person) ───────
  pushSingle(data.akta_jual_beli, DocumentType.AKTA_JUAL_BELI);
  pushSingle(data.bphtb, DocumentType.BPHTB);
  pushSingle(data.pph, DocumentType.PPH);
  pushSingle(data.sppt_pbb, DocumentType.SPPT_PBB);

  // ─── Dokumen Pembeli ────────────────────────────────────────────────
  pushArrayWithPerson(data.ktp_pembeli, DocumentType.KTP, "BUYER");
  pushArrayWithPerson(data.kk_pembeli, DocumentType.KARTU_KELUARGA, "BUYER");
  pushArrayWithPerson(data.npwp_pembeli, DocumentType.NPWP, "BUYER");
  pushArrayWithPerson(
    data.surat_nikah_pembeli,
    DocumentType.SURAT_NIKAH,
    "BUYER",
  );

  // ─── Dokumen Penjual ────────────────────────────────────────────────
  pushArrayWithPerson(data.ktp_penjual, DocumentType.KTP, "SELLER");
  pushArrayWithPerson(data.kk_penjual, DocumentType.KARTU_KELUARGA, "SELLER");
  pushArrayWithPerson(data.npwp_penjual, DocumentType.NPWP, "SELLER");
  pushArrayWithPerson(
    data.surat_nikah_penjual,
    DocumentType.SURAT_NIKAH,
    "SELLER",
  );

  return docs;
};
