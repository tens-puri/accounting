import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Budget, FilterOptions, Owner, Transaction } from '../types';
import CreditCardBillsWidget from './CreditCardBillsWidget';
import { PiggyBank, Wallet, AlertTriangle, PlusCircle, Save, RefreshCw } from 'lucide-react';

type Props = {
  transactions: Transaction[];
  filters: FilterOptions;
  setFilters: (v: FilterOptions) => void;
};

const EXPENSE_CATEGORIES: string[] = [
  'ของกิน',
  'ของใช้',
  'ลูก',
  'บ้าน',
  'รถ',
  'ลงทุน',
  'ฟุ่มเฟือย',
  'อื่นๆ',
];

const OWNER_OPTIONS: Owner[] = ['puri', 'phurita'];

const Dashboard: React.FC<Props> = ({ transactions, filters }) => {
  const month = filters.month || new Date().getMonth() + 1;
  const year = filters.year || new Date().getFullYear();
  const owner = filters.owner || 'all';

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const [installmentMonthly, setInstallmentMonthly] = useState(0);
  const [creditDue, setCreditDue] = useState(0);

  // ✅ ฟอร์มเพิ่มงบใหม่
  const [newBudget, setNewBudget] = useState({
    owner: (owner === 'all' ? 'puri' : owner) as Owner,
    category: EXPENSE_CATEGORIES[0],
    monthly_limit: 0,
  });

  // ✅ เก็บค่าที่ผู้ใช้แก้ในรายการเดิม
  const [editLimitMap, setEditLimitMap] = useState<Record<string, number>>({}); // key = budget.id

  // 1) รายจ่ายเงินสด/โอน (ไม่รวมบัตรเครดิต)
  const cashExpense = useMemo(() => {
    const list = transactions.filter(t => t.type === 'รายจ่าย');
    const cashOnly = list.filter(t => (t.payment_method ?? 'เงินสด') !== 'บัตรเครดิต');
    return cashOnly.reduce((s, t) => s + (Number(t.total_price) || 0), 0);
  }, [transactions]);

  // 2) รายจ่ายทั้งหมดตามวันที่ใช้จริง (รวมบัตรเครดิต)
  const realExpense = useMemo(() => {
    const list = transactions.filter(t => t.type === 'รายจ่าย');
    return list.reduce((s, t) => s + (Number(t.total_price) || 0), 0);
  }, [transactions]);

  // ✅ คำนวณใช้ไปต่อหมวด
  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'รายจ่าย') continue;
      const key = String(t.category);
      const prev = map.get(key) || 0;
      map.set(key, prev + (Number(t.total_price) || 0));
    }
    return map;
  }, [transactions]);

  const fetchBudgets = async () => {
    setBudgetLoading(true);
    setBudgetError(null);
    try {
      let q = supabase.from('budgets').select('*').order('created_at', { ascending: false });
      if (owner !== 'all') q = q.eq('owner', owner);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []) as Budget[];
      setBudgets(rows);

      // sync ค่า editLimitMap
      const init: Record<string, number> = {};
      for (const b of rows) init[b.id] = Number(b.monthly_limit) || 0;
      setEditLimitMap(init);
    } catch (e: any) {
      setBudgetError(e.message || 'ดึงข้อมูลงบประมาณไม่สำเร็จ');
    } finally {
      setBudgetLoading(false);
    }
  };

  const fetchInstallmentsMonthly = async () => {
    try {
      let q = supabase
        .from('installments')
        .select('monthly_amount, status, owner')
        .eq('status', 'active');

      if (owner !== 'all') q = q.eq('owner', owner);

      const { data, error } = await q;
      if (error) throw error;

      const sum = (data || []).reduce((s: number, r: any) => s + (Number(r.monthly_amount) || 0), 0);
      setInstallmentMonthly(sum);
    } catch {
      setInstallmentMonthly(0);
    }
  };

  const fetchCreditDue = async () => {
    try {
      let q = supabase
        .from('credit_card_bills')
        .select('amount, status, due_month, due_year, owner')
        .eq('status', 'pending')
        .eq('due_month', month)
        .eq('due_year', year);

      if (owner !== 'all') q = q.eq('owner', owner);

      const { data, error } = await q;
      if (error) throw error;

      const sum = (data || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      setCreditDue(sum);
    } catch {
      setCreditDue(0);
    }
  };

  useEffect(() => {
    fetchBudgets();
    fetchInstallmentsMonthly();
    fetchCreditDue();

    setNewBudget(prev => ({
      ...prev,
      owner: (owner === 'all' ? 'puri' : owner) as Owner,
    }));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, owner]);

  const cashObligationThisMonth = cashExpense + installmentMonthly + creditDue;

  const upsertBudget = async (ownerVal: string, category: string, limit: number) => {
    setBudgetLoading(true);
    setBudgetError(null);
    try {
      const { error } = await supabase.from('budgets').upsert(
        [{ owner: ownerVal, category, monthly_limit: limit }],
        { onConflict: 'owner,category' }
      );
      if (error) throw error;
      await fetchBudgets();
    } catch (e: any) {
      setBudgetError(e.message || 'บันทึกงบประมาณไม่สำเร็จ');
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleAddBudget = async () => {
    const limit = Number(newBudget.monthly_limit) || 0;
    if (limit <= 0) {
      setBudgetError('กรุณาใส่งบ/เดือน มากกว่า 0');
      return;
    }
    await upsertBudget(String(newBudget.owner), String(newBudget.category), limit);
    setBudgetError(null);
    setNewBudget(prev => ({ ...prev, monthly_limit: 0 }));
  };

  const handleSaveExisting = async (b: Budget) => {
    const newLimit = Number(editLimitMap[b.id] ?? b.monthly_limit) || 0;
    if (newLimit <= 0) {
      setBudgetError('กรุณาใส่งบ/เดือน มากกว่า 0');
      return;
    }
    await upsertBudget(String(b.owner), String(b.category), newLimit);
  };

  return (
    <div className="space-y-6">
      {/* ภาระเงินสดเดือนนี้ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold">ภาระเงินสดเดือนนี้</p>
              <p className="text-2xl font-black text-slate-900">
                {cashObligationThisMonth.toLocaleString()} ฿
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm font-bold text-slate-600">
            <div className="flex justify-between">
              <span>รายจ่าย (เงินสด/โอน)</span>
              <span>{cashExpense.toLocaleString()} ฿</span>
            </div>
            <div className="flex justify-between">
              <span>งวดผ่อน (รวม)</span>
              <span>{installmentMonthly.toLocaleString()} ฿</span>
            </div>
            <div className="flex justify-between">
              <span>บัตรเครดิตถึงกำหนด</span>
              <span>{creditDue.toLocaleString()} ฿</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold">รายจ่ายตามวันที่ใช้จริง</p>
              <p className="text-2xl font-black text-slate-900">
                {realExpense.toLocaleString()} ฿
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-4 font-medium">
            (รวมรายการรูดบัตรเครดิตด้วย เพื่อดูพฤติกรรมการใช้เงิน)
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold">เคล็ดลับใช้งาน</p>
              <p className="text-sm text-slate-700 font-medium mt-2">
                ตั้งงบต่อหมวด แล้วดูเปอร์เซ็นต์ใกล้เต็ม จะช่วยคุมรายจ่ายได้ดีมากครับ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* บิลบัตรเครดิต (pending) */}
      <CreditCardBillsWidget month={month} year={year} owner={owner as any} />

      {/* งบประมาณรายเดือน */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-black text-slate-900">งบประมาณรายเดือน (Budget)</h3>
          <p className="text-sm text-slate-500 mt-1">
            เพิ่มงบใหม่ได้จากฟอร์มด้านล่าง และแก้ไขงบเดิมได้ทันที
          </p>
        </div>

        {budgetError && (
          <div className="p-4 text-rose-700 bg-rose-50 border-b border-rose-100 font-medium">
            {budgetError}
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* เพิ่มงบใหม่ */}
          <div className="border border-slate-100 rounded-3xl p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <PlusCircle className="w-5 h-5 text-indigo-600" />
              <p className="font-black text-slate-900">เพิ่มงบประมาณใหม่</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">Owner</label>
                <select
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-black text-slate-700"
                  value={newBudget.owner}
                  onChange={(e) => setNewBudget(prev => ({ ...prev, owner: e.target.value as Owner }))}
                >
                  {OWNER_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-500">หมวดรายจ่าย</label>
                <select
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-black text-slate-700"
                  value={newBudget.category}
                  onChange={(e) => setNewBudget(prev => ({ ...prev, category: e.target.value }))}
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">งบ/เดือน (บาท)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-black text-slate-700"
                  value={newBudget.monthly_limit}
                  onChange={(e) => setNewBudget(prev => ({ ...prev, monthly_limit: Number(e.target.value || 0) }))}
                  placeholder="เช่น 3000"
                />
              </div>
            </div>

            <button
              onClick={handleAddBudget}
              disabled={budgetLoading}
              className="mt-4 w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-indigo-200 disabled:opacity-50"
              type="button"
            >
              เพิ่ม/บันทึกงบ
            </button>
          </div>

          {/* งบเดิม */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-black text-slate-900">งบที่ตั้งไว้</p>

              {/* ✅ ปุ่มรีเฟรชแบบเดียวกับบัตรเครดิต (ไอคอนหมุนเมื่อ loading) */}
              <button
                onClick={fetchBudgets}
                disabled={budgetLoading}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center gap-2 disabled:opacity-50"
                type="button"
              >
                <RefreshCw className={`w-4 h-4 ${budgetLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
            </div>

            {budgetLoading && budgets.length === 0 ? (
              <div className="text-slate-500 font-medium">กำลังโหลดงบประมาณ...</div>
            ) : budgets.length === 0 ? (
              <div className="text-slate-500 font-medium">
                ยังไม่มีงบประมาณ — ลองเพิ่มงบหมวด “ของกิน / บ้าน / ฟุ่มเฟือย” ก่อนครับ
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.map(b => {
                  const catKey = String(b.category);
                  const spent = spentByCategory.get(catKey) || 0;
                  const limit = Number(editLimitMap[b.id] ?? b.monthly_limit) || 0;
                  const percent = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                  const warn = percent >= 80;

                  return (
                    <div key={b.id} className="border border-slate-100 rounded-3xl p-5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-black text-slate-900">{catKey}</p>
                          <p className="text-sm text-slate-500 font-bold">
                            ใช้ไป {spent.toLocaleString()} / {limit.toLocaleString()} ฿
                            {warn ? <span className="ml-2 text-rose-600">ใกล้เต็ม!</span> : null}
                            <span className="ml-2 text-slate-400">• owner: {b.owner}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="w-36 bg-slate-50 border-none rounded-2xl px-3 py-2 font-black text-slate-700"
                            value={limit}
                            onChange={(e) => {
                              const v = Number(e.target.value || 0);
                              setEditLimitMap(prev => ({ ...prev, [b.id]: v }));
                            }}
                          />
                          <button
                            onClick={() => handleSaveExisting(b)}
                            disabled={budgetLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-2xl flex items-center gap-2 disabled:opacity-50"
                            type="button"
                          >
                            <Save className="w-4 h-4" />
                            บันทึก
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all ${warn ? 'bg-rose-500' : 'bg-indigo-600'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
            <p className="font-black text-slate-800">Tip</p>
            <p className="text-sm text-slate-600 font-medium mt-1">
              ถ้าอยากคุมเงินจริง ๆ ให้ตั้งงบ “ของกิน + ฟุ่มเฟือย + บ้าน” ก่อน แล้วดูเปอร์เซ็นต์ใกล้เต็มครับ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
