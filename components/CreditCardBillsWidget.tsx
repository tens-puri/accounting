import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditCardBill, Owner } from '../types';
import { CheckCircle2, RefreshCw } from 'lucide-react';

type Props = {
  month: number;
  year: number;
  owner: Owner | 'all';
};

const CreditCardBillsWidget: React.FC<Props> = ({ month, year, owner }) => {
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<CreditCardBill[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('credit_card_bills')
        .select('*')
        .eq('status', 'pending')
        .eq('due_month', month)
        .eq('due_year', year)
        .order('created_at', { ascending: false });

      if (owner !== 'all') q = q.eq('owner', owner);

      const { data, error } = await q;
      if (error) throw error;
      setBills((data || []) as CreditCardBill[]);
    } catch (e: any) {
      setError(e.message || 'ดึงข้อมูลบิลบัตรไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, owner]);

  const totalDue = useMemo(
    () => bills.reduce((s, b) => s + (Number(b.amount) || 0), 0),
    [bills]
  );

  const markPaid = async (billId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('credit_card_bills')
        .update({ status: 'paid' })
        .eq('id', billId);

      if (error) throw error;
      await fetchBills();
    } catch (e: any) {
      setError(e.message || 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-900">บัตรเครดิตที่ต้องจ่ายเดือนนี้</h3>
          <p className="text-sm text-slate-500 mt-1">
            รวมยอดค้างจ่าย: <span className="font-black text-indigo-700">{totalDue.toLocaleString()} ฿</span>
          </p>
        </div>

        <button
          onClick={fetchBills}
          disabled={loading}
          className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </button>
      </div>

      {error && (
        <div className="p-4 text-rose-700 bg-rose-50 border-b border-rose-100 font-medium">
          {error}
        </div>
      )}

      <div className="p-6">
        {bills.length === 0 ? (
          <div className="text-slate-500 font-medium">
            ไม่มีบิลค้างจ่ายของเดือนนี้ 🎉
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map(b => (
              <div
                key={b.id}
                className="border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-black text-slate-900">
                    {Number(b.amount).toLocaleString()} ฿
                  </p>
                  <p className="text-xs text-slate-500 font-bold">
                    owner: {b.owner} {b.note ? `• ${b.note}` : ''}
                  </p>
                </div>

                <button
                  onClick={() => markPaid(b.id)}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-2xl flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  จ่ายแล้ว
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditCardBillsWidget;
