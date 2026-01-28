import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, OWNERS, TYPES } from '../constants';
import { Category, Owner, TransactionType, PaymentMethod, RecurringTemplate } from '../types';
import { Save, Calendar, Tag, User, Hash, DollarSign, AlertCircle, CreditCard, Wallet, QrCode, BookmarkPlus } from 'lucide-react';

interface Props {
  onSuccess: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['เงินสด', 'โอน/สแกน', 'บัตรเครดิต'];

const TransactionForm: React.FC<Props> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Templates
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(''); // '' = none

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'รายจ่าย' as TransactionType,
    description: '',
    category: EXPENSE_CATEGORIES[0] as Category,
    quantity: 1,
    price_per_unit: 0,
    owner: 'puri' as Owner,
    payment_method: 'เงินสด' as PaymentMethod,
  });

  const totalPrice = formData.quantity * formData.price_per_unit;

  const currentCategories = useMemo(
    () => (formData.type === 'รายรับ' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES),
    [formData.type]
  );

  const fetchTemplates = async () => {
    setTemplateLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as RecurringTemplate[]);
    } catch {
      setTemplates([]);
    } finally {
      setTemplateLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleTypeChange = (type: TransactionType) => {
    const defaultCategory = type === 'รายรับ' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
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

  const applyTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find(x => x.id === id);
    if (!t) return;

    setFormData(prev => ({
      ...prev,
      type: t.type,
      category: t.category,
      description: t.description,
      quantity: t.quantity,
      price_per_unit: t.price_per_unit,
      owner: t.owner,
      payment_method: (t.payment_method ?? 'เงินสด') as PaymentMethod,
    }));
  };

  const saveAsTemplate = async () => {
    if (!formData.description.trim()) {
      alert('กรุณาใส่รายละเอียดก่อน เพื่อใช้เป็น Template');
      return;
    }

    const name = prompt('ตั้งชื่อ Template (เช่น ค่าเช่า / ค่าเน็ต / ค่าอาหารเช้า):');
    if (!name?.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      owner: formData.owner,
      name: name.trim(),
      type: formData.type,
      category: formData.category,
      description: formData.description.trim(),
      quantity: Number(formData.quantity) || 1,
      price_per_unit: Number(formData.price_per_unit) || 0,
      payment_method: formData.type === 'รายจ่าย' ? formData.payment_method : null,
    };

    try {
      const { error } = await supabase.from('recurring_templates').insert([payload]);
      if (error) throw error;
      await fetchTemplates();
      alert('บันทึกเป็น Template เรียบร้อยแล้ว!');
    } catch (e: any) {
      setErrorMsg(e.message || 'บันทึก Template ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
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
      payment_method: formData.type === 'รายจ่าย' ? formData.payment_method : null,
    };

    try {
      const { error } = await supabase.from('transactions').insert([payload]);

      if (error) {
        if (error.code === '23514') {
          throw new Error('ข้อมูลบางช่องไม่ผ่านเงื่อนไขของฐานข้อมูล');
        }
        throw error;
      }

      onSuccess();

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
        <h2 className="text-xl font-black text-slate-900">บันทึกรายการใหม่</h2>
        <p className="text-sm text-slate-500 mt-1">กรอกรายละเอียดรายรับหรือรายจ่ายของคุณ</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 text-rose-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-black">บันทึกไม่สำเร็จ</p>
              <p className="opacity-90">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Templates */}
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-black text-slate-900">รายการประจำ (Template)</p>
              <p className="text-xs text-slate-500 font-bold">เลือกเพื่อเติมข้อมูลเร็ว หรือบันทึกเป็น Template เพื่อใช้ครั้งหน้า</p>
            </div>
            <button
              type="button"
              onClick={fetchTemplates}
              className="px-4 py-2 rounded-2xl bg-white border border-slate-100 font-black text-slate-700"
              disabled={templateLoading}
            >
              {templateLoading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              className="w-full bg-white border border-slate-100 rounded-2xl px-4 py-3 font-black text-slate-700"
              value={selectedTemplateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">— เลือก Template —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.owner})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={saveAsTemplate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2"
              disabled={loading}
            >
              <BookmarkPlus className="w-5 h-5" />
              บันทึกเป็น Template
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> วันที่
            </label>
            <input
              type="date"
              required
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">ประเภทหลัก</label>
            <div className="flex p-1 bg-slate-100 rounded-2xl">
              {TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
                    formData.type === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Tag className="w-4 h-4" /> หมวดหมู่ {formData.type}
            </label>
            <select
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
            >
              {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4" /> เจ้าของรายการ
            </label>
            <select
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
              value={formData.owner}
              onChange={e => setFormData({ ...formData, owner: e.target.value as Owner })}
            >
              {OWNERS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </select>
          </div>

          {/* Payment method (only expense) */}
          {formData.type === 'รายจ่าย' && (
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> ช่องทางชำระเงิน
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setFormData({ ...formData, payment_method: pm })}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-sm border transition-all
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
                  <p className="font-black mb-1">หมายเหตุเรื่องบัตรเครดิต</p>
                  <p className="opacity-90">
                    ระบบจะบันทึกรายจ่ายเป็น “วันที่รูดบัตร” และจะสร้างบิลรอจ่ายเดือนถัดไปในตาราง
                    <span className="font-black"> credit_card_bills</span> ให้อัตโนมัติครับ
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-black text-slate-700">รายละเอียด</label>
          <input
            type="text"
            required
            placeholder={formData.type === 'รายรับ' ? "เช่น เงินเดือน, ดอกเบี้ย..." : "เช่น ค่าข้าว, ค่าเดินทาง..."}
            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Hash className="w-4 h-4" /> จำนวน
            </label>
            <input
              type="number"
              min="1"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> ราคาต่อหน่วย
            </label>
            <input
              type="number"
              min="0"
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
              value={formData.price_per_unit}
              onChange={e => setFormData({ ...formData, price_per_unit: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="col-span-2 md:col-span-1 bg-indigo-50 rounded-2xl p-4 flex flex-col justify-center border border-indigo-100">
            <p className="text-xs text-indigo-600 font-black uppercase tracking-wider">รวมทั้งสิ้น</p>
            <p className="text-2xl font-black text-indigo-900">{totalPrice.toLocaleString()} ฿</p>
          </div>
        </div>

        <button
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          บันทึกรายการ
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
