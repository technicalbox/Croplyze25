"use client";
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Diagnosis } from "@/lib/types";

const chartConfig = {
  count: {
    label: "Detections",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function DiseaseChart({ diagnoses }: { diagnoses: Diagnosis[] | null }) {
  const chartData = (diagnoses || []).reduce((acc, item) => {
    const diseaseName = item.diagnosis.diseaseName;
    const existing = acc.find(d => d.disease === diseaseName);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ disease: diseaseName, count: 1 });
    }
    return acc;
  }, [] as { disease: string; count: number }[]);

  return (
    <ChartContainer config={chartConfig} className="w-full h-auto aspect-video">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          accessibilityLayer
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            bottom: 40,
            left: 20,
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="disease"
            tickLine={false}
            axisLine={false}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            interval={0}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
