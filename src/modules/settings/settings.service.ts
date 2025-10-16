import { CreateSettingDTO, UpdateSettingDTO, BulkUpdateSettingsDTO, SettingType, ParsedSettingValue } from './settings.types';
import { settingsRepository } from './settings.repository';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';

export class SettingsService {
  // Parse setting value based on type
  private parseValue(value: string, type: SettingType): ParsedSettingValue {
    try {
      switch (type) {
        case 'number':
          const num = parseFloat(value);
          if (isNaN(num)) {
            throw new Error('Invalid number format');
          }
          return num;
        case 'boolean':
          return value === 'true' || value === '1';
        case 'json':
          return JSON.parse(value);
        case 'string':
        default:
          return value;
      }
    } catch (error) {
      throw new AppError(400, `Failed to parse value as ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Stringify value for storage
  private stringifyValue(value: any, type: SettingType): string {
    if (type === 'json') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  // List all settings
  async listSettings() {
    const settings = await settingsRepository.findAll();

    // Parse values for response
    return settings.map((setting) => ({
      ...setting,
      parsedValue: this.parseValue(setting.value, setting.type as SettingType),
    }));
  }

  // Get setting by key
  async getSettingByKey(key: string) {
    const setting = await settingsRepository.findByKey(key);

    if (!setting) {
      throw new AppError(404, 'Setting not found');
    }

    return {
      ...setting,
      parsedValue: this.parseValue(setting.value, setting.type as SettingType),
    };
  }

  // Create setting
  async createSetting(data: CreateSettingDTO, userId: string) {
    // Check if setting already exists
    const existing = await settingsRepository.findByKey(data.key);
    if (existing) {
      throw new AppError(409, 'Setting with this key already exists');
    }

    // Validate value can be parsed
    this.parseValue(data.value, data.type);

    const setting = await settingsRepository.create(data, userId);

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'Setting',
        entityId: setting.id,
        changes: {
          key: data.key,
          value: data.value,
          type: data.type,
        } as any,
        userId,
      },
    });

    logger.info(`Setting created: ${data.key} by user ${userId}`);

    return {
      ...setting,
      parsedValue: this.parseValue(setting.value, setting.type as SettingType),
    };
  }

  // Update setting
  async updateSetting(key: string, data: UpdateSettingDTO, userId: string, userAgent?: string, ipAddress?: string) {
    const existingSetting = await settingsRepository.findByKey(key);

    if (!existingSetting) {
      throw new AppError(404, 'Setting not found');
    }

    // Validate value can be parsed
    const type = data.type || (existingSetting.type as SettingType);
    this.parseValue(data.value, type);

    const setting = await settingsRepository.update(key, data, userId);

    // Audit log
    const changes: any = {};
    if (data.value !== existingSetting.value) {
      changes.value = { from: existingSetting.value, to: data.value };
    }
    if (data.type && data.type !== existingSetting.type) {
      changes.type = { from: existingSetting.type, to: data.type };
    }

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Setting',
        entityId: setting.id,
        changes: changes as any,
        userId,
        userAgent,
        ipAddress,
      },
    });

    logger.info(`Setting updated: ${key} by user ${userId}`);

    return {
      ...setting,
      parsedValue: this.parseValue(setting.value, setting.type as SettingType),
    };
  }

  // Delete setting
  async deleteSetting(key: string, userId: string, userAgent?: string, ipAddress?: string) {
    const setting = await settingsRepository.findByKey(key);

    if (!setting) {
      throw new AppError(404, 'Setting not found');
    }

    await settingsRepository.delete(key);

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entity: 'Setting',
        entityId: setting.id,
        changes: {
          key: setting.key,
          value: setting.value,
          type: setting.type,
        } as any,
        userId,
        userAgent,
        ipAddress,
      },
    });

    logger.info(`Setting deleted: ${key} by user ${userId}`);

    return { message: 'Setting deleted successfully' };
  }

  // Upsert setting (create or update)
  async upsertSetting(key: string, value: string, type: SettingType, userId: string) {
    // Validate value can be parsed
    this.parseValue(value, type);

    const setting = await settingsRepository.upsert(key, value, type, userId);

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Setting',
        entityId: setting.id,
        changes: {
          key,
          value,
          type,
        } as any,
        userId,
      },
    });

    logger.info(`Setting upserted: ${key} by user ${userId}`);

    return {
      ...setting,
      parsedValue: this.parseValue(setting.value, setting.type as SettingType),
    };
  }

  // Bulk update settings
  async bulkUpdateSettings(data: BulkUpdateSettingsDTO, userId: string, userAgent?: string, ipAddress?: string) {
    // Validate all values can be parsed
    for (const setting of data.settings) {
      const type = setting.type || 'string';
      this.parseValue(setting.value, type);
    }

    // Perform bulk upsert
    const settingsData = data.settings.map((s) => ({
      key: s.key,
      value: s.value,
      type: (s.type || 'string') as SettingType,
    }));

    const updatedSettings = await settingsRepository.bulkUpsert(settingsData, userId);

    // Audit log for bulk operation
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Setting',
        entityId: 'bulk',
        changes: {
          count: data.settings.length,
          keys: data.settings.map((s) => s.key),
        } as any,
        userId,
        userAgent,
        ipAddress,
      },
    });

    logger.info(`Bulk settings update: ${data.settings.length} settings by user ${userId}`);

    return updatedSettings.map((setting) => ({
      ...setting,
      parsedValue: this.parseValue(setting.value, setting.type as SettingType),
    }));
  }

  // Get settings count
  async getSettingsCount() {
    return settingsRepository.count();
  }
}

export const settingsService = new SettingsService();
