import React from 'react';
import type { TraitScore } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface RadarChartComponentProps {
  data: TraitScore[];
}

const RadarChartComponent: React.FC<RadarChartComponentProps> = ({ data }) => {
  const chartData = data.map(item => ({
    subject: item.trait,
    A: item.score,
    fullMark: 100,
  }));
  
  return (
    <div className="w-full">
        <ResponsiveContainer width="100%" aspect={1.1}>
            <RadarChart 
              cx="50%" 
              cy="50%" 
              outerRadius="80%" 
              data={chartData}
              margin={{ top: 30, right: 50, bottom: 30, left: 50 }}
            >
                <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
                    </linearGradient>
                </defs>
                <PolarGrid stroke="#D1D5DB" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4B5563', fontSize: 11 }} />
                <Radar name="スコア" dataKey="A" stroke="#6366f1" fill="url(#colorUv)" fillOpacity={0.7} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderColor: '#D1D5DB',
                        borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: '#1F2937' }}
                />
            </RadarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default RadarChartComponent;