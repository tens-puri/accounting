import React, { useState, useEffect, useCallback } from 'react';
import { supabase, getEnv } from './lib/supabase';
import { Transaction, FilterOptions } from './types';
import { MONTHS } from './constants';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import Dashboard from './components/Dashboard';
import Installments from './components/Installments';

import {
  LayoutDashboard,
  PlusCircle,
  ListOrdered,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  Sparkles,
  Settings,
  CreditCard
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'add' | 'installments'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);

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

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAddSuccess = () => {
    fetchTransactions();
    setActiveTab('transactions');
  };

  const generateAIInsight = async () => {
    if (transactions.length === 0) {
      setAiInsight("ยังไม่มีข้อมูลในเดือนนี้ให้วิเคราะห์จ้า ลองเพิ่มรายการดูก่อนนะ");
      return;
    }

    setAiLoading(true);
    try {
      const apiKey = getEnv('NEXT_PUBLIC_API_KEY');

      if (!apiKey) {
        setAiInsight("ไม่พบ API Key ในระบบ! กรุณาตรวจสอบการตั้งค่า Environment Variables");
        setShowKeyWarning(true);
        setAiLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const expenseSummary = transactions
        .filter(t => t.type === 'รายจ่าย')
        .map(t => `- ${t.category}: ${t.description} (${t.total_price} ฿)`)
        .join('\n');

      if (!expenseSummary) {
        setAiInsight("เดือนนี้ยังไม่มีรายจ่ายเลย เยี่ยมมาก! เก็บออมให้เต็มที่นะ");
        setAiLoading(false);
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `นี่คือรายการรายจ่ายของครอบครัวเรา:\n${expenseSummary}\n\nช่วยสรุปสั้นๆ ว่าใช้เงินไปกับอะไรเยอะที่สุด และแนะนำวิธีประหยัดในหมวดนั้นๆ ให้ Puri และ Phurita หน่อย (ตอบเป็นภาษาไทย เป็นกันเองแบบคนในครอบครัว)`,
      });

      setAiInsight(response.text || "AI มึนตึ้บ วิเคราะห์ไม่ได้เฉยเลย ลองกดอีกทีนะ");
      setShowKeyWarning(false);
    } catch (error: any) {
      console.error('AI error:', error);
      setAiInsight("เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI ลองเช็ค API Key อีกครั้งนะ");
      setShowKeyWarning(true);
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
          <p className="text-sm text-slate-500 font-medium">Puri & Phurita Family</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <ListOrdered className="w-5 h-5" />
            Transactions
          </button>

          {/* ✅ เมนูใหม่: รายการผ่อน */}
          <button
            onClick={() => setActiveTab('installments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'installments' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <CreditCard className="w-5 h-5" />
            รายการผ่อน
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'add' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <PlusCircle className="w-5 h-5" />
            บันทึกรายการ
          </button>
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100">
            <p className="text-xs opacity-80 uppercase font-bold tracking-wider mb-1">คงเหลือรวม</p>
            <p className="text-xl font-bold">{(totals.income - totals.expense).toLocaleString()} ฿</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="md:hidden flex items-center justify-between mb-6">
          <h1 className="text-xl font-black text-indigo-600 tracking-tight">P&P ACCOUNT</h1>
          <div className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md shadow-indigo-100">
            {(totals.income - totals.expense).toLocaleString()} ฿
          </div>
        </div>

        {/* สรุปตัวเลขด้านบน: แสดงเฉพาะบางหน้า (ไม่โชว์ในหน้า "รายการผ่อน" จะดูโล่งกว่า) */}
        {activeTab !== 'installments' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-emerald-200 transition-colors">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">รายรับเดือนนี้</p>
                  <p className="text-2xl font-bold text-slate-900">{totals.income.toLocaleString()} ฿</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-rose-200 transition-colors">
                <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">รายจ่ายเดือนนี้</p>
                  <p className="text-2xl font-bold text-slate-900">{totals.expense.toLocaleString()} ฿</p>
                </div>
              </div>

              <div
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 sm:col-span-2 lg:col-span-1 flex items-center justify-between group cursor-pointer"
                onClick={generateAIInsight}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${aiLoading ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-amber-50 text-amber-600'}`}>
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-bold">AI Financial Insight</p>
                    <p className="text-xs text-indigo-600 font-bold group-hover:underline">คลิกเพื่อวิเคราะห์</p>
                  </div>
                </div>
                {aiLoading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />}
              </div>
            </div>

            {aiInsight && (
              <div className="mb-8 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Sparkles className="w-24 h-24 text-indigo-600" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> AI สรุปให้
                  </h3>
                  <button onClick={() => setAiInsight("")} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase">ปิด</button>
                </div>
                <p className="text-indigo-800 text-sm leading-relaxed whitespace-pre-line font-medium">{aiInsight}</p>

                {showKeyWarning && (
                  <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-indigo-100">
                    <p className="text-xs text-indigo-600 font-bold flex items-center gap-2 mb-2">
                      <Settings className="w-3 h-3" /> วิธีตั้งค่าให้ AI ทำงาน:
                    </p>
                    <ol className="text-xs text-slate-600 list-decimal ml-4 space-y-1">
                      <li>ไปที่ Vercel Dashboard ของคุณ</li>
                      <li>เลือก Settings → Environment Variables</li>
                      <li>เพิ่มชื่อ <b>NEXT_PUBLIC_API_KEY</b> แล้วใส่ค่า Gemini Key</li>
                      <li>กด Save แล้วไปที่หน้า Deployments เพื่อกด <b>Redeploy</b> ครับ</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard transactions={transactions} filters={filters} setFilters={setFilters} />
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">ตัวกรอง:</span>
                </div>

                <select
                  className="bg-slate-50 border-none text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: Number(e.target.value) })}
                >
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>

                <select
                  className="bg-slate-50 border-none text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={filters.owner}
                  onChange={(e) => setFilters({ ...filters, owner: e.target.value as any })}
                >
                  <option value="all">ทุกคน</option>
                  <option value="puri">Puri</option>
                  <option value="phurita">Phurita</option>
                </select>

                <select
                  className="bg-slate-50 border-none text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                >
                  <option value="all">รายรับ & รายจ่าย</option>
                  <option value="รายรับ">เฉพาะรายรับ</option>
                  <option value="รายจ่าย">เฉพาะรายจ่าย</option>
                </select>

                <select
                  className="bg-slate-50 border-none text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                >
                  <option value="date_desc">วันที่ล่าสุด</option>
                  <option value="price_desc">ราคาสูงสุด</option>
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

        {/* ✅ หน้าใหม่: รายการผ่อน */}
        {activeTab === 'installments' && (
          <Installments />
        )}
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`p-2.5 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'text-indigo-600 bg-indigo-50 shadow-sm' : 'text-slate-400'}`}
        >
          <LayoutDashboard className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`p-2.5 rounded-2xl transition-all ${activeTab === 'transactions' ? 'text-indigo-600 bg-indigo-50 shadow-sm' : 'text-slate-400'}`}
        >
          <ListOrdered className="w-6 h-6" />
        </button>

        {/* ✅ Mobile เมนู “รายการผ่อน” */}
        <button
          onClick={() => setActiveTab('installments')}
          className={`p-2.5 rounded-2xl transition-all ${activeTab === 'installments' ? 'text-indigo-600 bg-indigo-50 shadow-sm' : 'text-slate-400'}`}
        >
          <CreditCard className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('add')}
          className={`p-2.5 rounded-2xl transition-all ${activeTab === 'add' ? 'text-indigo-600 bg-indigo-50 shadow-sm' : 'text-slate-400'}`}
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
};

export default App;
