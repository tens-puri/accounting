
export type TransactionType = 'รายรับ' | 'รายจ่าย';

export type Category = 
  | 'ของกิน' | 'ของใช้' | 'ลูก' | 'บ้าน' | 'รถ' | 'ลงทุน' | 'ฟุ่มเฟือย'
  | 'เงินเดือน' | 'ดอกเบี้ย' | 'กดเงินจากบัตร' | 'ขอเงินจากคนอื่น' | 'อื่นๆ';

export type Owner = 'puri' | 'phurita';

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
