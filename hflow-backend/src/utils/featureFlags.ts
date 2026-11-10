export function paymentsEnabled(): boolean {
  return process.env.ENABLE_PAYMENTS?.trim().toLowerCase() === "true";
}
