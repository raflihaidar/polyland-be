import { certificateQueue } from "../queues/certificate.queue";

export const addCertificateJob = async ({
  fileNumber,
  notes,
}: {
  fileNumber: string;
  notes: string[];
}) => {
  const job = await certificateQueue.add(
    "issue-certificate",
    {
      fileNumber,
      notes,
    },
    {
      jobId: `cert-${fileNumber}-${Date.now()}`,
    },
  );

  return job;
};
