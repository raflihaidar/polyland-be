import { coreApi } from "../config/midtrans.js";
import { AppError } from "../utils/error.js";

export const getPaymentInvoice = async (amount: number) => {
  try {
    const chargeParameter = {
      payment_type: "qris",
      transaction_details: {
        order_id: `ORDER-${Date.now()}`,
        gross_amount: amount,
      },
    };

    const response = await coreApi.charge(chargeParameter);

    return response;
  } catch (err: any) {
    throw new AppError("Gagal membuat invoice", 500, err.meta);
  }
};
