import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, OWNERS, TYPES } from '../constants';
import { Category, Owner, TransactionType, PaymentMethod } from '../types';
import { Save, Calendar, Tag, User, Hash, DollarSign, AlertCircle, CreditCard, Wallet, QrCode } from 'lucide-react';

interface Props {
  onSuccess: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['เงินสด', 'โอน/สแกน', 'บัตรเครดิต'];

const TransactionForm: React.FC<Props> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'รายจ่าย' as TransactionType,
    description: '',
    category: 'ของกิน' as Category,
    quantity: 1,
    price_per_unit: 0,
    owner: 'puri' as Owner,
    payment_method: 'เงินสด' as PaymentMethod, // ✅ เพิ่มใหม่
  });

  const totalPrice = formData.quantity * formData.price_per_unit;

  // เลือกรายการหมวดหมู่ตามประเภทที่ User เลือก
  const currentCategories = formData.type === 'รายรับ' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // ฟังก์ชันสลับประเภทรายการ และเปลี่ยนหมวดหมู่เริ่มต้นให้เหมาะสม
  const handleTypeChange = (type: TransactionType) => {
    const defaultCategory = type === 'รายรับ' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];

    // ถ้าเปลี่ยนเป็นรายรับ เราจะไม่ต้องบังคับช่องทางชำระเงิน (ตั้งเป็น null ได้)
    // แต่เพื่อความง่ายใน UI ยังแสดงค่าเดิมไว้ และค่อยส่ง null ตอนบันทึก
    setFormData({
      ...formData,
      type,
      category: defaultCategory,
    });
    setErrorMsg(null);
  };

  const getPaymentIcon = (pm: PaymentMethod) => {
    if (pm === 'เงินสด') return <Wallet className="w-4 h-4" />;
    if (pm === 'โอน/สแกน') return <QrCode className="w-4 h-4" />;
    return <CreditCard className="w-4 h-4" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const dateObj = new Date(formData.date);

    const payload = {
      day: dateObj.getDate(),
      month: dateObj.getMonth() + 1,
      year: dateObj.getFullYear(),
      type: formData.type,
      description: formData.description,
      category: formData.category,
      quantity: formData.quantity,
      price_per_unit: formData.price_per_unit,
      total_price: totalPrice,
      owner: formData.owner,

      // ✅ ส่ง payment_method เฉพาะ "รายจ่าย"
      payment_method: formData.type === 'รายจ่าย' ? formData.payment_method : null,
    };

    try {
      const { error } = await supabase.from('transactions').insert([payload]);

      if (error) {
        // จัดการกรณี Error จาก Check Constraint ใน DB
        if (error.code === '23514') {
          throw new Error(`ข้อมูลบางช่องไม่ผ่านเงื่อนไขของฐานข้อมูล (Check Constraint Error)`);
        }
        throw error;
      }

      onSuccess();

      // reset บางช่อง (ยังคง type/category/owner/payment_method ไว้เพื่อกรอกต่อได้ง่าย)
      setFormData({
        ...formData,
        description: '',
        price_per_unit: 0,
        quantity: 1,
      });

      alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
    } catch (error: any) {
      console.error('Insert error:', error);
      setErrorMsg(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-8">
      <div className="p-8 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <PlusCircleIcon className="w-6 h-6 text-indigo-600" />
          บันทึกรายการใหม่
        </h2>
        <p className="text-sm text-slate-500 mt-1">กรอกรายละเอียดรายรับหรือรายจ่ายของคุณ</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 text-rose-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">บันทึกไม่สำเร็จ</p>
              <p className="opacity-90">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> วันที่
            </label>
            <input
              type="date"
              required
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          {/* Type Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">ประเภทหลัก</label>
            <div className="flex p-1 bg-slate-100 rounded-2xl">
              {TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${formData.type === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Tag className="w-4 h-4" /> หมวดหมู่ {formData.type}
            </label>
            <select
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
            >
              {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Owner Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4" /> เจ้าของรายการ
            </label>
            <select
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={formData.owner}
              onChange={e => setFormData({ ...formData, owner: e.target.value as Owner })}
            >
              {OWNERS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </select>
          </div>

          {/* ✅ Payment method (แสดงเฉพาะ "รายจ่าย") */}
          {formData.type === 'รายจ่าย' && (
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> ช่องทางชำระเงิน
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setFormData({ ...formData, payment_method: pm })}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm border transition-all
                      ${formData.payment_method === pm
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                      }`}
                  >
                    {getPaymentIcon(pm)}
                    {pm}
                  </button>
                ))}
              </div>

              {formData.payment_method === 'บัตรเครดิต' && (
                <div className="text-sm bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-4">
                  <p className="font-bold mb-1">หมายเหตุเรื่องบัตรเครดิต</p>
                  <p className="opacity-90">
                    ระบบจะบันทึกรายจ่ายเป็น “วันที่รูดบัตร” และ (ถ้าคุณตั้ง Trigger ในฐานข้อมูลไว้แล้ว)
                    จะสร้างบิลรอจ่ายเดือนถัดไปในตาราง <span className="font-bold">credit_card_bills</span> ให้อัตโนมัติครับ
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">รายละเอียด</label>
          <input
            type="text"
            required
            placeholder={formData.type === 'รายรับ' ? "เช่น เงินเดือนเดือน ธ.ค., ดอกเบี้ยออมทรัพย์..." : "เช่น ค่าข้าวเย็น, ค่าที่พัก..."}
            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Hash className="w-4 h-4" /> จำนวน
            </label>
            <input
              type="number"
              min="1"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> ราคาต่อหน่วย
            </label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={formData.price_per_unit}
              onChange={e => setFormData({ ...formData, price_per_unit: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="col-span-2 md:col-span-1 bg-indigo-50 rounded-2xl p-4 flex flex-col justify-center border border-indigo-100">
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">รวมทั้งสิ้น</p>
            <p className="text-2xl font-black text-indigo-900">{totalPrice.toLocaleString()} ฿</p>
          </div>
        </div>

        <button
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <RefreshCwIcon className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          บันทึกรายการ
        </button>
      </form>
    </div>
  );
};

// Helper internal components
const PlusCircleIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RefreshCwIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default TransactionForm;
