
import React, { useMemo } from 'react';
import { Transaction, FilterOptions } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { MONTHS, YEARS } from '../constants';

interface Props {
  transactions: Transaction[];
  filters: FilterOptions;
  setFilters: (f: FilterOptions) => void;
}

const Dashboard: React.FC<Props> = ({ transactions, filters, setFilters }) => {
  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'รายจ่าย');
    const data: { name: string; value: number }[] = [];
    const map = new Map<string, number>();

    expenses.forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.total_price);
    });

    map.forEach((value, name) => data.push({ name, value }));
    return data.sort((a, b) => b.value - a.value);
  }, [transactions]);

  const dailyData = useMemo(() => {
    const dataMap = new Map<number, { day: number; income: number; expense: number }>();
    
    // Fill all days of month
    const daysInMonth = new Date(filters.year || 2024, filters.month || 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dataMap.set(i, { day: i, income: 0, expense: 0 });
    }

    transactions.forEach(t => {
      const entry = dataMap.get(t.day);
      if (entry) {
        if (t.type === 'รายรับ') entry.income += t.total_price;
        else entry.expense += t.total_price;
      }
    });

    return Array.from(dataMap.values());
  }, [transactions, filters.month, filters.year]);

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-8">
      {/* Date Filters Dashboard Top */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
         <h2 className="text-xl font-bold text-slate-800">สรุปภาพรวมรายเดือน</h2>
         <div className="flex gap-2">
            <select 
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
              value={filters.month}
              onChange={(e) => setFilters({...filters, month: Number(e.target.value)})}
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select 
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
              value={filters.year}
              onChange={(e) => setFilters({...filters, year: Number(e.target.value)})}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">แนวโน้มรายวัน</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={10} name="รายรับ" />
                <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={10} name="รายจ่าย" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Allocation */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">สัดส่วนรายจ่ายตามหมวดหมู่</h3>
          {categoryData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">ไม่มีข้อมูลรายจ่าย</div>
          )}
        </div>
      </div>
      
      {/* Top Expenses List */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 mb-6">หมวดหมู่ที่ใช้เงินมากที่สุด</h3>
        <div className="space-y-4">
          {categoryData.slice(0, 3).map((cat, idx) => (
            <div key={cat.name} className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-600">{cat.name}</span>
                <span className="text-slate-900">{cat.value.toLocaleString()} ฿</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000" 
                  style={{ 
                    width: `${(cat.value / categoryData.reduce((a,b) => a + b.value, 0)) * 100}%`,
                    backgroundColor: COLORS[idx % COLORS.length]
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
