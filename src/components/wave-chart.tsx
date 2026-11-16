"use client"

import * as React from "react"

type WaveChartProps = {
  data: { t: number; v: number }[]
  height?: number
  color?: string
}

export function WaveChart({ data, height = 70, color = "var(--color-seafoam)" }: WaveChartProps) {
  if (!data || data.length === 0) return null
  if (data.length === 1) data = [data[0], { ...data[0], t: data[0].t + 1 }]
  const width = 240
  const min = Math.min(...data.map((d) => d.v))
  const max = Math.max(...data.map((d) => d.v))
  const range = max - min || 1
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((d.v - min) / range) * (height - 10)
      return `${x},${y}`
    })
    .join(" ")
  const first = data[0]
  const fx = 0
  const fy = height - ((first.v - min) / range) * (height - 10)
  return (
    <svg
      width={width}
      height={height}
      className="text-current"
      style={{ color: color }}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
    >
      <defs>
        <linearGradient id="waveGrad" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="currentColor" stopOpacity="0.35" offset="0%" />
          <stop stopColor="currentColor" stopOpacity="0" offset="100%" />
        </linearGradient>
      </defs>
      <path
        d={`M${fx},${fy} L${points} V${height} H${fx} Z`}
        fill="url(#waveGrad)"
      />
      <path d={`M${fx},${fy} L${points}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((d.v - min) / range) * (height - 10)
        return i === 0 || i === data.length - 1 ? (
          <circle key={i} cx={x} cy={y} r={2.5} fill="currentColor" />
        ) : null
      })}
    </svg>
  )
}
