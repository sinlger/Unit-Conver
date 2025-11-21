export interface UnitDictionary {
  symbol: string;
  category: string;
  category_zh: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface UnitLocalization {
  unit_symbol: string;
  lang_code: string;
  name: string;
  source_description?: string | null;
}

export interface UnitConversionLog {
  from_unit: string;
  input_value: string;
  to_unit: string;
  output_value: string;
  lang_code: string;
  conversion_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
}
