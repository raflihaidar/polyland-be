import { coreApi } from "../config/midtrans.js";
import { MidtransNotification } from "../types/domain/payment.type.js";
import { AppError } from "../utils/error.js";

import crypto from "crypto";
import axios from "axios";
import { PaymentStatus } from "../generated/prisma/enums.js";

export const isValidNotification = async (
  notification: MidtransNotification,
) => {
  try {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
    } = notification;

    const stringToHash = `${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`;
    const localSignature = crypto
      .createHash("sha512")
      .update(stringToHash)
      .digest("hex");

    if (localSignature !== signature_key) {
      throw new AppError("Invalid Signature Key", 400);
    }

    return {
      transaction_status,
      order_id,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Error saat mendapatkan notifikasi dari midtrans", 500);
  }
};

export const createPayment = async (amount: number) => {
  try {
    const chargeParameter = {
      payment_type: "qris",
      transaction_details: {
        order_id: `ORDER-${Date.now()}`,
        gross_amount: amount,
      },
    };

    const res = await coreApi.charge(chargeParameter);

    if (!res) return null;

    const invoice = {
      status_code: res.status_code,
      order_id: res.order_id,
      amount: res.gross_amount,
      payment_type: res.payment_type,
      status: res.transaction_status,
      qr_url: res.actions[0].url,
      expiry_time: res.expiry_time,
    };

    console.log("invoice : ", invoice);

    return invoice;
  } catch (err: any) {
    console.log(err);
    throw new AppError("Gagal membuat invoice", 500, err.meta);
  }
};

const mapMidtransStatus = (transactionStatus: string): PaymentStatus => {
  switch (transactionStatus) {
    case "pending":
      return PaymentStatus.PENDING
    case "capture":
    case "settlement":
      return PaymentStatus.SUCCESS
    case "expire":
      return PaymentStatus.EXPIRED
    case "cancel":
    case "deny":
      return PaymentStatus.CANCELED
    case "refund":
    case "partial_refund":
      return PaymentStatus.REFUND
    default:
      return PaymentStatus.PENDING
  }
}

export const getPaymentStatus = async (orderId: string) => {
  try {
    const { data } = await axios.get(
      `${process.env.MIDTRANS_SANDBOX_API_URL}/${orderId}/status`,
      {
        auth: {
          username: process.env.MIDTRANS_SERVER_KEY!,
          password: "",
        },
      },
    );
    const res = data;
    const payment = {
      status: mapMidtransStatus(res.transaction_status),
      amount: res.gross_amount,
      created_at: res.transaction_time,
    };
    return payment;
  } catch (error: any) {
    console.error(error.response?.data);
    throw error;
  }
};

export const cancelPayment = async (orderId: string) => {
  try {
    const { data } = await axios.post(
      `${process.env.MIDTRANS_SANDBOX_API_URL}/${orderId}/cancel`,
      {},
      {
        auth: {
          username: process.env.MIDTRANS_SERVER_KEY!,
          password: "",
        },
      },
    );

    const res = data;

    const payment = {
      status_code: res.status_code,
      status: res.transaction_status,
      amount: res.gross_amount,
    };

    return payment;
  } catch (error: any) {
    console.error(error.response?.data);
    throw error;
  }
};

// export const createPayment = async (amount: number) => {
//   try {
//     const response = await xenditPaymentRequestClient.createPaymentRequest({
//       data: {
//         amount,
//         currency: "IDR",
//         referenceId: `ORDER-${Date.now()}`,
//         paymentMethod: {
//           qrCode: {
//             channelCode: "QRIS",
//           },
//           reusability: "ONE_TIME_USE",
//           type: "QR_CODE",
//         },
//       },
//     });

//     console.log("QRIS Payment Request Successful:", response);

//     console.dir(response, { depth: null });

//     return response;
//   } catch (error) {
//     console.error("Error creating QRIS payment:", error);
//   }
// };
