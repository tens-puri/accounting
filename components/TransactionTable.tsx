import React, { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';
import { Tag, Pencil, Trash2, X } from 'lucide-react';

type Props = {
  transactions: Transaction[];
  loading: boolean;
  sortBy?: 'price_desc' | 'date_desc';
  onChanged?: () => void;
};

const TransactionTable: React.FC<Props> = ({ transactions, loading, sortBy = 'date_desc', onChanged }) => {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...transactions];
    if (sortBy === 'price_desc') {
      arr.sort((a, b) => (Number(b.total_price) || 0) - (Number(a.total_price) || 0));
    } else {
      // date_desc
      arr.sort((a, b) => {
        const ad = new Date(a.created_at || 0).getTime();
        const bd = new Date(b.created_at || 0).getTime();
        return bd - ad;
      });
    }
    return arr;
  }, [transactions, sortBy]);

  const removeTx = async (id?: string) => {
    if (!id) return;
    if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return;

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      onChanged?.();
    } catch (e: any) {
      alert(e.message || 'ลบไม่สำเร็จ');
    }
  };

  const saveEdit = async () => {
    if (!editing?.id) return;
    setSaving(true);
    try {
      const payload: any = {
        description: editing.description,
        category: editing.category,
        quantity: editing.quantity,
        price_per_unit: editing.price_per_unit,
        total_price: (Number(editing.quantity) || 0) * (Number(editing.price_per_unit) || 0),
        owner: editing.owner,
        payment_method: editing.type === 'รายจ่าย' ? (editing.payment_method ?? 'เงินสด') : null,
      };

      const { error } = await supabase.from('transactions').update(payload).eq('id', editing.id);
      if (error) throw error;

      setEditing(null);
      onChanged?.();
    } catch (e: any) {
      alert(e.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-black text-slate-900">รายการทั้งหมด</h2>
        <p className="text-sm text-slate-500 mt-1">แก้ไข/ลบได้ทันที</p>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-slate-500 font-medium">กำลังโหลดข้อมูล...</div>
        ) : sorted.length === 0 ? (
          <div className="text-slate-500 font-medium">ยังไม่มีข้อมูล</div>
        ) : (
          <div className="space-y-3">
            {sorted.map(tx => (
              <div key={tx.id} className="border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-slate-900 truncate">
                    {tx.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="bg-slate-50 text-slate-600 text-xs font-black px-3 py-1 rounded-full border border-slate-100 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {tx.category}
                    </span>

                    {tx.type === 'รายจ่าย' && tx.payment_method && (
                      <span className="bg-indigo-50 text-indigo-600 text-xs font-black px-3 py-1 rounded-full border border-indigo-100">
                        {tx.payment_method}
                      </span>
                    )}

                    <span className="text-xs font-black text-slate-400">
                      {tx.day}/{tx.month}/{tx.year} • {tx.owner}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`text-right font-black ${tx.type === 'รายรับ' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'รายรับ' ? '+' : '-'}{Number(tx.total_price).toLocaleString()} ฿
                  </div>

                  <button
                    onClick={() => setEditing(tx)}
                    className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200"
                    title="แก้ไข"
                  >
                    <Pencil className="w-4 h-4 text-slate-700" />
                  </button>

                  <button
                    onClick={() => removeTx(tx.id)}
                    className="p-2 rounded-2xl bg-rose-50 hover:bg-rose-100"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-slate-900 font-black text-lg">แก้ไขรายการ</p>
                <p className="text-sm text-slate-500 font-medium">แก้เฉพาะรายละเอียด/จำนวน/ราคา/หมวด/owner/ช่องทางจ่าย</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">รายละเอียด</label>
                <input
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">หมวด</label>
                  <input
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value as any })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">owner</label>
                  <select
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
                    value={editing.owner}
                    onChange={(e) => setEditing({ ...editing, owner: e.target.value as any })}
                  >
                    <option value="puri">puri</option>
                    <option value="phurita">phurita</option>
                  </select>
                </div>
              </div>

              {editing.type === 'รายจ่าย' && (
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">ช่องทางชำระเงิน</label>
                  <select
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
                    value={editing.payment_method ?? 'เงินสด'}
                    onChange={(e) => setEditing({ ...editing, payment_method: e.target.value as any })}
                  >
                    <option value="เงินสด">เงินสด</option>
                    <option value="โอน/สแกน">โอน/สแกน</option>
                    <option value="บัตรเครดิต">บัตรเครดิต</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">จำนวน</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
                    value={editing.quantity}
                    onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">ราคาต่อหน่วย</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold"
                    value={editing.price_per_unit}
                    onChange={(e) => setEditing({ ...editing, price_per_unit: Number(e.target.value) })}
                    min={0}
                  />
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                <p className="text-xs text-indigo-600 font-black uppercase tracking-wider">รวมใหม่</p>
                <p className="text-2xl font-black text-indigo-900">
                  {((Number(editing.quantity) || 0) * (Number(editing.price_per_unit) || 0)).toLocaleString()} ฿
                </p>
              </div>

              <button
                onClick={saveEdit}
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
