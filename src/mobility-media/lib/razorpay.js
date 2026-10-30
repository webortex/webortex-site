/**
 * Razorpay Checkout loader.
 *
 * The script is loaded on demand, only when someone actually adds funds, so the
 * portal does not pull a third-party script onto every page.
 *
 * The success callback here is *not* a payment confirmation: it runs in the
 * payer's browser and can be forged. The wallet is credited only by the signed
 * server-side webhook; this callback only tells the UI to start watching for it.
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loading = null;

export function loadRazorpay() {
  if (typeof window === "undefined") return Promise.reject(new Error("Checkout needs a browser."));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Checkout failed to initialise.")));
      script.onerror = () => {
        loading = null;
        reject(new Error("Could not load the payment window. Check your connection and try again."));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

/**
 * Open Checkout for a server-created order.
 *
 * Resolves `"paid"` when the payer completes the flow and `"dismissed"` when
 * they close the window; rejects on a payment failure.
 */
export async function openCheckout(order, { description = "Wallet top-up" } = {}) {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountMinor,
      currency: order.currency ?? "INR",
      name: "Webortex Mobility Media",
      description,
      prefill: order.prefill ?? {},
      notes: { receipt: order.receipt ?? "" },
      handler: () => resolve("paid"),
      modal: { ondismiss: () => resolve("dismissed") },
    });
    checkout.on("payment.failed", (response) => {
      reject(new Error(response?.error?.description ?? "The payment did not go through."));
    });
    checkout.open();
  });
}
