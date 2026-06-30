import { coreApi } from "../config/midtrans.js";
import { AppError } from "../utils/error.js";
// import "dotenv/config";
import axios from "axios";

export const getPaymentInvoice = async (amount: number) => {
  try {
    const chargeParameter = {
      payment_type: "qris",
      transaction_details: {
        order_id: `ORDER-${Date.now()}`,
        gross_amount: amount,
      },
    };

    const res = await coreApi.charge(chargeParameter);

    const invoice = {
      status_code: res.status_code,
      order_id: res.order_id,
      amount: res.gross_amount,
      payment_type: res.payment_type,
      status: res.transaction_status,
      qr_url: res.actions.url,
      expiry_time: res.expiry_time,
    };
    return invoice;
  } catch (err: any) {
    console.log(err);
    throw new AppError("Gagal membuat invoice", 500, err.meta);
  }
};

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
      status: res.transaction_status,
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
