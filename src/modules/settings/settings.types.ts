// Setting value types
export type SettingType = 'string' | 'number' | 'boolean' | 'json';

// Create setting DTO
export interface CreateSettingDTO {
  key: string;
  value: string;
  type: SettingType;
}

// Update setting DTO
export interface UpdateSettingDTO {
  value: string;
  type?: SettingType;
}

// Setting response
export interface SettingResponse {
  id: string;
  key: string;
  value: string;
  type: SettingType;
  updatedBy: {
    id: string;
    username: string;
  } | null;
  updatedAt: Date;
}

// Bulk update DTO
export interface BulkUpdateSettingsDTO {
  settings: Array<{
    key: string;
    value: string;
    type?: SettingType;
  }>;
}

// Parsed setting value (for typed retrieval)
export type ParsedSettingValue = string | number | boolean | Record<string, any>;
