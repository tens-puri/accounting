export type TransactionType = 'รายรับ' | 'รายจ่าย';

export type Category =
  | 'ของกิน' | 'ของใช้' | 'ลูก' | 'บ้าน' | 'รถ' | 'ลงทุน' | 'ฟุ่มเฟือย'
  | 'เงินเดือน' | 'ดอกเบี้ย' | 'กดเงินจากบัตร' | 'ขอเงินจากคนอื่น' | 'อื่นๆ';

export type Owner = 'puri' | 'phurita';

export type PaymentMethod = 'เงินสด' | 'โอน/สแกน' | 'บัตรเครดิต';

export interface Transaction {
  id?: string;
  day: number;
  month: number;
  year: number;
  type: TransactionType;
  description: string;
  category: Category;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  owner: Owner;
  payment_method?: PaymentMethod | null;
  created_at?: string;
}

export interface FilterOptions {
  month?: number;
  year?: number;
  owner?: Owner | 'all';
  type?: TransactionType | 'all';
  category?: Category | 'all';
  sortBy?: 'price_desc' | 'date_desc';
}

/** Budgets */
export interface Budget {
  id: string;
  owner: Owner;
  category: Category;
  monthly_limit: number;
  created_at: string;
}

/** Credit card bills */
export type CreditBillStatus = 'pending' | 'paid' | 'canceled';

export interface CreditCardBill {
  id: string;
  owner: Owner;
  source_transaction_id: string | null;
  amount: number;
  due_month: number;
  due_year: number;
  status: CreditBillStatus;
  note: string | null;
  created_at: string;
}

/** Recurring templates (for quick copy) */
export interface RecurringTemplate {
  id: string;
  owner: Owner;
  name: string;
  type: TransactionType;
  category: Category;
  description: string;
  quantity: number;
  price_per_unit: number;
  payment_method: PaymentMethod | null;
  created_at: string;
}
