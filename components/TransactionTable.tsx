
import React from 'react';
import { Transaction } from '../types';
import { TrendingUp, TrendingDown, User, Tag, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  sortBy: string;
}

const TransactionTable: React.FC<Props> = ({ transactions, loading, sortBy }) => {
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (sortBy === 'price_desc') return b.total_price - a.total_price;
    // Default to date_desc (handled by Supabase order but safe to have here)
    return 0; 
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
           <ListIcon className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">ไม่มีรายการในช่วงเวลานี้</h3>
        <p className="text-slate-500 mt-1">เริ่มบันทึกรายการรายรับรายจ่ายได้ที่หน้า 'บันทึกรายการ'</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:grid grid-cols-6 px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <div className="col-span-2">รายการ</div>
        <div>หมวดหมู่</div>
        <div>เจ้าของ</div>
        <div className="text-right">ราคาต่อหน่วย</div>
        <div className="text-right">รวม</div>
      </div>
      
      {sortedTransactions.map((tx) => (
        <div key={tx.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
          <div className="grid grid-cols-1 md:grid-cols-6 items-center gap-4">
            {/* Main Info */}
            <div className="col-span-1 md:col-span-2 flex items-center gap-4">
              <div className={`p-3 rounded-2xl flex-shrink-0 ${tx.type === 'รายรับ' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {tx.type === 'รายรับ' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{tx.description}</p>
                <p className="text-xs text-slate-400 font-medium">
                  {tx.day}/{tx.month}/{tx.year}
                </p>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-2">
               <div className="md:hidden text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 w-20">หมวดหมู่:</div>
               <span className="bg-slate-50 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-100 flex items-center gap-1">
                 <Tag className="w-3 h-3" /> {tx.category}
               </span>
            </div>

            {/* Owner */}
            <div className="flex items-center gap-2">
              <div className="md:hidden text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 w-20">โดย:</div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border ${tx.owner === 'puri' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>
                <User className="w-3 h-3" /> {tx.owner}
              </span>
            </div>

            {/* Units */}
            <div className="text-right hidden md:block">
              <p className="text-sm text-slate-500 font-medium">
                {tx.price_per_unit.toLocaleString()} x {tx.quantity}
              </p>
            </div>

            {/* Total */}
            <div className="text-right">
              <p className={`text-lg font-black ${tx.type === 'รายรับ' ? 'text-emerald-600' : 'text-slate-900'}`}>
                {tx.type === 'รายรับ' ? '+' : '-'}{tx.total_price.toLocaleString()} ฿
              </p>
              <div className="md:hidden text-xs text-slate-400 mt-1">
                 {tx.price_per_unit.toLocaleString()} x {tx.quantity}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ListIcon = ({className}: {className: string}) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

export default TransactionTable;
