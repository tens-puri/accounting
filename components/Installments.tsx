import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';

type InstallmentStatus = 'active' | 'completed' | 'canceled';

type Installment = {
  id: string;
  owner: string;
  title: string;
  total_amount: number;
  monthly_amount: number;
  total_months: number;
  paid_months: number;
  start_month: number;
  start_year: number;
  status: InstallmentStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const OWNERS = [
  { value: 'puri', label: 'Puri' },
  { value: 'phurita', label: 'Phurita' },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmt(n: number) {
  return (n || 0).toLocaleString();
}

const Installments: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Installment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ฟอร์มเพิ่มรายการผ่อน
  const [form, setForm] = useState({
    owner: 'puri',
    title: '',
    total_amount: 0,
    monthly_amount: 0,
    total_months: 12,
    paid_months: 0,
    start_month: new Date().getMonth() + 1,
    start_year: new Date().getFullYear(),
    note: '',
  });

  const fetchInstallments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as Installment[]);
    } catch (e: any) {
      setError(e.message || 'ดึงข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallments();
  }, []);

  const activeItems = useMemo(
    () => items.filter(i => i.status === 'active'),
    [items]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // เช็คเบื้องต้นแบบง่าย ๆ
    if (!form.title.trim()) {
      setLoading(false);
      setError('กรุณาใส่ชื่อรายการผ่อน');
      return;
    }
    if (form.total_months <= 0) {
      setLoading(false);
      setError('จำนวนเดือนต้องมากกว่า 0');
      return;
    }

    const payload = {
      owner: form.owner,
      title: form.title.trim(),
      total_amount: Number(form.total_amount) || 0,
      monthly_amount: Number(form.monthly_amount) || 0,
      total_months: Number(form.total_months) || 1,
      paid_months: clamp(Number(form.paid_months) || 0, 0, Number(form.total_months) || 1),
      start_month: clamp(Number(form.start_month) || 1, 1, 12),
      start_year: Number(form.start_year) || new Date().getFullYear(),
      status: 'active' as InstallmentStatus,
      note: form.note?.trim() ? form.note.trim() : null,
    };

    try {
      const { error } = await supabase.from('installments').insert([payload]);
      if (error) throw error;

      // รีเฟรชรายการ
      await fetchInstallments();

      // reset form บางส่วน
      setForm({
        ...form,
        title: '',
        total_amount: 0,
        monthly_amount: 0,
        total_months: 12,
        paid_months: 0,
        note: '',
      });
    } catch (e: any) {
      setError(e.message || 'เพิ่มรายการไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const markPaidPlusOne = async (item: Installment) => {
    setLoading(true);
    setError(null);

    const nextPaid = clamp(item.paid_months + 1, 0, item.total_months);
    const nextStatus: InstallmentStatus = nextPaid >= item.total_months ? 'completed' : 'active';

    try {
      const { error } = await supabase
        .from('installments')
        .update({ paid_months: nextPaid, status: nextStatus })
        .eq('id', item.id);

      if (error) throw error;
      await fetchInstallments();
    } catch (e: any) {
      setError(e.message || 'อัปเดตไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const cancelInstallment = async (item: Installment) => {
    if (!confirm(`ต้องการยกเลิกรายการ "${item.title}" ใช่ไหม?`)) return;

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('installments')
        .update({ status: 'canceled' })
        .eq('id', item.id);

      if (error) throw error;
      await fetchInstallments();
    } catch (e: any) {
      setError(e.message || 'ยกเลิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const calcProgressPercent = (i: Installment) => {
    if (!i.total_months) return 0;
    return clamp((i.paid_months / i.total_months) * 100, 0, 100);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">รายการผ่อน</h1>
          <p className="text-slate-500 mt-1">เพิ่มรายการผ่อน และติดตามความคืบหน้าแบบหลอด Progress</p>
        </div>

        <button
          onClick={fetchInstallments}
          className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl font-medium">
          {error}
        </div>
      )}

      {/* ฟอร์มเพิ่มรายการผ่อน */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-black text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            เพิ่มรายการผ่อน
          </h2>
          <p className="text-sm text-slate-500 mt-1">กรอกข้อมูล แล้วกดบันทึก</p>
        </div>

        <form onSubmit={handleAdd} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">เจ้าของรายการ</label>
            <select
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
              value={form.owner}
              onChange={e => setForm({ ...form, owner: e.target.value })}
            >
              {OWNERS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">ชื่อรายการผ่อน</label>
            <input
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
              placeholder="เช่น ผ่อนรถ / ผ่อนโทรศัพท์"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">ยอดทั้งหมด (บาท)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
              value={form.total_amount}
              onChange={e => setForm({ ...form, total_amount: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">ยอดผ่อนต่อเดือน (บาท)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
              value={form.monthly_amount}
              onChange={e => setForm({ ...form, monthly_amount: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">จำนวนเดือนทั้งหมด</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
              value={form.total_months}
              onChange={e => setForm({ ...form, total_months: Number(e.target.value) })}
              min={1}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">จ่ายไปแล้ว (งวด)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
              value={form.paid_months}
              onChange={e => setForm({ ...form, paid_months: Number(e.target.value) })}
              min={0}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">เริ่มผ่อน (เดือน)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
              value={form.start_month}
              onChange={e => setForm({ ...form, start_month: Number(e.target.value) })}
              min={1}
              max={12}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">เริ่มผ่อน (ปี)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
              value={form.start_year}
              onChange={e => setForm({ ...form, start_year: Number(e.target.value) })}
              min={2000}
              max={3000}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-slate-700">หมายเหตุ (ถ้ามี)</label>
            <input
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
              placeholder="เช่น ดอก 0%, ผ่อนกับร้าน..."
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <button
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              บันทึกรายการผ่อน
            </button>
          </div>
        </form>
      </div>

      {/* การ์ดรายการผ่อน */}
      <h2 className="text-lg font-black text-slate-900 mb-4">รายการผ่อนที่กำลังดำเนินอยู่</h2>

      {activeItems.length === 0 ? (
        <div className="text-slate-500 bg-white border border-slate-100 rounded-3xl p-6">
          ยังไม่มีรายการผ่อน (ลองเพิ่มรายการด้านบนได้เลยครับ)
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeItems.map(i => {
            const percent = calcProgressPercent(i);
            const remaining = Math.max(0, i.total_months - i.paid_months);

            return (
              <div key={i.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-slate-900 font-black text-lg">{i.title}</p>
                    <p className="text-slate-500 text-sm mt-1">
                      เจ้าของ: <span className="font-bold">{i.owner}</span> • เริ่ม {i.start_month}/{i.start_year}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold">คงเหลือ</p>
                    <p className="text-xl font-black text-indigo-700">{remaining} งวด</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold">ยอดทั้งหมด</p>
                    <p className="text-lg font-black text-slate-900">{fmt(i.total_amount)} ฿</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold">ต่อเดือน</p>
                    <p className="text-lg font-black text-slate-900">{fmt(i.monthly_amount)} ฿</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-600 mb-2">
                    <span>ความคืบหน้า</span>
                    <span>{i.paid_months}/{i.total_months} งวด ({percent.toFixed(0)}%)</span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-3 bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => markPaidPlusOne(i)}
                    disabled={loading || i.paid_months >= i.total_months}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    จ่ายแล้ว +1 งวด
                  </button>

                  <button
                    onClick={() => cancelInstallment(i)}
                    disabled={loading}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-2xl flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    ยกเลิก
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Installments;
