
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Transaction, FilterOptions, Owner, TransactionType, Category } from './types';
import { CATEGORIES, OWNERS, TYPES, MONTHS, YEARS } from './constants';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import Dashboard from './components/Dashboard';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ListOrdered, 
  TrendingUp, 
  TrendingDown,
  Filter,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'add'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    owner: 'all',
    type: 'all',
    category: 'all',
    sortBy: 'date_desc'
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*');

      if (filters.month) query = query.eq('month', filters.month);
      if (filters.year) query = query.eq('year', filters.year);
      if (filters.owner !== 'all') query = query.eq('owner', filters.owner);
      if (filters.type !== 'all') query = query.eq('type', filters.type);
      if (filters.category !== 'all') query = query.eq('category', filters.category);

      // Simple ordering - we'll do complex sorting client-side for better UX if needed
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      alert('เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleAddSuccess = () => {
    fetchTransactions();
    setActiveTab('transactions');
  };

  const generateAIInsight = async () => {
    if (transactions.length === 0) return;
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const summary = transactions.map(t => `${t.type}: ${t.description} (${t.total_price} บาท)`).join('\n');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `นี่คือรายการรายรับรายจ่ายของฉันในเดือนนี้:
        ${summary}
        
        ช่วยสรุปภาพรวมการใช้เงินแบบสั้นๆ กระชับ และแนะนำวิธีประหยัดเงินให้ Puri และ Phurita หน่อย (ตอบเป็นภาษาไทย)`,
      });
      
      setAiInsight(response.text || "ไม่สามารถวิเคราะห์ได้ในขณะนี้");
    } catch (error) {
      console.error('AI error:', error);
      setAiInsight("ไม่สามารถเชื่อมต่อ AI ได้");
    } finally {
      setAiLoading(false);
    }
  };

  const totals = transactions.reduce((acc, curr) => {
    if (curr.type === 'รายรับ') acc.income += curr.total_price;
    else acc.expense += curr.total_price;
    return acc;
  }, { income: 0, expense: 0 });

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-50">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8" />
            Accounting
          </h1>
          <p className="text-sm text-slate-500">Puri & Phurita</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <ListOrdered className="w-5 h-5" />
            Transactions
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'add' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <PlusCircle className="w-5 h-5" />
            บันทึกรายการ
          </button>
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-indigo-600 rounded-2xl p-4 text-white">
            <p className="text-xs opacity-80 uppercase font-bold tracking-wider mb-1">Balance</p>
            <p className="text-xl font-bold">{(totals.income - totals.expense).toLocaleString()} ฿</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header mobile */}
        <div className="md:hidden flex items-center justify-between mb-6">
           <h1 className="text-xl font-bold text-indigo-600">P&P Accounting</h1>
           <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm font-medium">
              {(totals.income - totals.expense).toLocaleString()} ฿
           </div>
        </div>

        {/* Dashboard Cards Top */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">รายรับทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-900">{totals.income.toLocaleString()} ฿</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">รายจ่ายทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-900">{totals.expense.toLocaleString()} ฿</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 sm:col-span-2 lg:col-span-1 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">AI Insights</p>
                  <button 
                    onClick={generateAIInsight}
                    disabled={aiLoading}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    {aiLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : "ขอคำแนะนำจาก AI"}
                  </button>
                </div>
             </div>
          </div>
        </div>

        {aiInsight && (
          <div className="mb-8 bg-indigo-50 border border-indigo-100 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Sparkles className="w-16 h-16 text-indigo-600" />
            </div>
            <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Analysis
            </h3>
            <p className="text-indigo-800 text-sm leading-relaxed whitespace-pre-line">{aiInsight}</p>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <Dashboard transactions={transactions} filters={filters} setFilters={setFilters} />
        )}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Filters:</span>
                </div>
                <select 
                  className="bg-slate-50 border-none text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={filters.month}
                  onChange={(e) => setFilters({...filters, month: Number(e.target.value)})}
                >
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                  className="bg-slate-50 border-none text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={filters.owner}
                  onChange={(e) => setFilters({...filters, owner: e.target.value as any})}
                >
                  <option value="all">ทุกคน</option>
                  <option value="puri">Puri</option>
                  <option value="phurita">Phurita</option>
                </select>
                <select 
                  className="bg-slate-50 border-none text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value as any})}
                >
                  <option value="all">ทุกประเภท</option>
                  <option value="รายรับ">รายรับ</option>
                  <option value="รายจ่าย">รายจ่าย</option>
                </select>
                <select 
                  className="bg-slate-50 border-none text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value as any})}
                >
                  <option value="date_desc">ล่าสุด -> เก่า</option>
                  <option value="price_desc">ราคามาก -> น้อย</option>
                </select>
              </div>
            </div>
            <TransactionTable transactions={transactions} loading={loading} sortBy={filters.sortBy} />
          </div>
        )}
        {activeTab === 'add' && (
          <div className="max-w-2xl mx-auto">
            <TransactionForm onSuccess={handleAddSuccess} />
          </div>
        )}
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-xl ${activeTab === 'dashboard' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('transactions')} className={`p-2 rounded-xl ${activeTab === 'transactions' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
          <ListOrdered className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('add')} className={`p-2 rounded-xl ${activeTab === 'add' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
          <PlusCircle className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
};

export default App;
