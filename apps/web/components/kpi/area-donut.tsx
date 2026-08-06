'use client'

/**
 * 평가영역별 비중 도넛.
 *
 * 색만으로 구분되므로 **범례 텍스트가 필수**다(시안에도 있다).
 * 같은 수치가 아래 KPI 항목 표에도 있어 대체 경로가 존재한다(screen-behavior.md 접근성).
 */

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatPercentCompact } from '@kpi/core'

const COLORS = ['#2563eb', '#f97316', '#10b981', '#a855f7', '#f43f5e', '#0891b2']

export type AreaSlice = { area: string; weight: number }

export function AreaDonut({ data }: { data: AreaSlice[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">항목이 없습니다.</p>
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="weight"
            nameKey="area"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((slice, index) => (
              <Cell key={slice.area} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatPercentCompact(Number(value))} />
          <Legend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            formatter={(value, entry) => {
              const weight = (entry?.payload as unknown as AreaSlice | undefined)?.weight ?? 0
              return `${value} (${formatPercentCompact(weight)})`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
