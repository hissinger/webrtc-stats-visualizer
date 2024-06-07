import React from "react";
import { Chart, ChartConfiguration, registerables } from "chart.js";
import "chartjs-adapter-luxon";
import StreamingPlugin from "chartjs-plugin-streaming";

Chart.register(...registerables, StreamingPlugin);

type WebRTCStatsVisualizerProps = {
  label: string;
  borderColor: string;
  width: number;
  height: number;
};

export type WebRTCStatsVisualizerHandle = {
  pushData: (timestamp: number, value: number) => void;
};

const WebRTCStatsVisualizer = React.forwardRef<
  WebRTCStatsVisualizerHandle,
  WebRTCStatsVisualizerProps
>((props, ref) => {
  const { label, borderColor, width, height } = props;

  const chartRef = React.useRef<Chart | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const data = React.useMemo(
    () => ({
      labels: [],
      datasets: [
        {
          label,
          data: [],
          fill: false,
          borderColor,
        },
      ],
    }),
    [label, borderColor]
  );

  React.useEffect(() => {
    const ctx = canvasRef.current!.getContext("2d")!;
    const config: ChartConfiguration<"line"> = {
      type: "line",
      data,
      options: {
        responsive: true,
        scales: {
          x: {
            type: "realtime",
            realtime: {
              duration: 60_000 * 10,
              delay: 5_000,
              refresh: 5_000,
            },
          },
          y: {
            beginAtZero: true,
          },
        },
      },
    };
    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  React.useImperativeHandle(ref, () => ({
    pushData(timestamp: number, value: number) {
      if (chartRef.current) {
        chartRef.current.data.datasets[0].data.push({ x: timestamp, y: value });
        chartRef.current.update("none");
      }
    },
  }));

  return (
    <div>
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
});

export default WebRTCStatsVisualizer;
