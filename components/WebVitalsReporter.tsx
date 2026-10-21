'use client'

import { useReportWebVitals } from 'next/web-vitals'

type WebVitalsCallback = Parameters<typeof useReportWebVitals>[0]

const analyticsEndpoint = process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT
const REPORTED_METRICS = new Set(['CLS', 'FID', 'LCP'])

const reportWebVital: WebVitalsCallback = (metric) => {
  if (!REPORTED_METRICS.has(metric.name)) return

  const payload = JSON.stringify({
    id: metric.id,
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    navigationType: metric.navigationType,
  })

  if (!analyticsEndpoint) {
    window.dispatchEvent(
      new CustomEvent('hflow:web-vital', {
        detail: {
          id: metric.id,
          name: metric.name,
          value: metric.value,
          delta: metric.delta,
          rating: metric.rating,
          navigationType: metric.navigationType,
        },
      }),
    )
    return
  }

  const body = new Blob([payload], { type: 'application/json' })
  if (navigator.sendBeacon(analyticsEndpoint, body)) return

  void fetch(analyticsEndpoint, {
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch((error: unknown) => {
    console.error(
      '[WebVitalsReporter] No se pudo enviar la métrica:',
      error instanceof Error ? error.message : error,
    )
  })
}

export default function WebVitalsReporter() {
  useReportWebVitals(reportWebVital)
  return null
}
