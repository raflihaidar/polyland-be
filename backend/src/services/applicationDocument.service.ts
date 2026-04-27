import path from "path";
import { DocumentType } from "../generated/prisma/enums";

export const mapApplicationDocuments = (applicationId: string, data: any) => {
  const docs: any[] = [];

  const baseFolder = `applications/${applicationId}`;

  const pushSingle = (file: any, type: DocumentType) => {
    if (!file) return;

    docs.push({
      application_id: applicationId,
      type,
      fileUrl: `${baseFolder}/${path.basename(file.path)}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });
  };

  const pushArrayWithPerson = (items: any[], type: DocumentType) => {
    if (!items?.length) return;

    items.forEach((item) => {
      if (!item.file) return;

      docs.push({
        application_id: applicationId,
        type,
        fileUrl: `${baseFolder}/${path.basename(item.file.path)}`,
        fileName: item.file.originalname,
        mimeType: item.file.mimetype,
        fileSize: item.file.size,
      });
    });
  };

  pushSingle(data.cert_file, DocumentType.SERTIFIKAT_TANAH);
  pushSingle(data.akta_jual_beli, DocumentType.AKTA_JUAL_BELI);
  pushSingle(data.fc_sppt, DocumentType.SPPT);
  pushSingle(data.fc_pbb, DocumentType.PBB);
  pushSingle(data.ssb, DocumentType.SSB);

  pushArrayWithPerson(data.ktp_pembeli, DocumentType.KTP_PEMBELI);
  pushArrayWithPerson(data.ktp_penjual, DocumentType.KTP_PENJUAL);
  pushArrayWithPerson(data.kk_pembeli, DocumentType.KK_PEMBELI);

  return docs;
};
