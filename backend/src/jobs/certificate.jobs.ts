import { certificateQueue } from "../queues/certificate.queue.js";

interface SignedForwardRequestInput {
  from: string;
  to: string;
  value: string;
  gas: string;
  deadline: number;
  data: string;
  signature: string;
}

export const addCertificateJob = async ({
  fileNumber,
  notes,
  signedRequest,
}: {
  fileNumber: string;
  notes: string[];
  signedRequest: SignedForwardRequestInput;
}) => {
  const job = await certificateQueue.add(
    "issue-certificate",
    {
      fileNumber,
      notes,
      signedRequest,
    },
    {
      jobId: `cert-${fileNumber}-${Date.now()}`,
    },
  );

  return job;
};
