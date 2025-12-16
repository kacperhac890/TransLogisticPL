import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { RouteSegment, ColorConfig } from '../types';
import { LABELS } from '../constants';

interface RouteChartProps {
  segments: RouteSegment[];
  colors: ColorConfig;
}

export const RouteChart: React.FC<RouteChartProps> = ({ segments, colors }) => {
  const data = segments.map(s => ({
    name: LABELS[s.type],
    value: s.distanceKm,
    color: colors[s.type]
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`${value} km`, 'Dystans']}
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};