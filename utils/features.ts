export function paymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PAYMENTS?.trim().toLowerCase() === 'true'
}
