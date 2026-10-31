// Which gateway a form charges through, and what PayPal can take. PayPal is one-off only, so a subscription form always uses Stripe.

// Currencies PayPal's Orders API accepts.
export const PAYPAL_CURRENCIES = new Set(["aud", "brl", "cad", "chf", "cny", "czk", "dkk", "eur", "gbp", "hkd", "huf", "ils", "jpy", "mxn", "myr", "nok", "nzd", "php", "pln", "sek", "sgd", "thb", "twd", "usd"]);

export function responseGateway(settings) {
  return settings?.payments?.gateway === "paypal" && settings.payments.mode !== "subscription" ? "paypal" : "stripe";
}
