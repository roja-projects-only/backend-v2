import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { settingsService } from './settings.service';
import { sendSuccess } from '../../utils/response';
import { CreateSettingDTO, UpdateSettingDTO, BulkUpdateSettingsDTO } from './settings.types';

export class SettingsController {
  // List all settings
  async listSettings(req: AuthRequest, res: Response) {
    const settings = await settingsService.listSettings();
    sendSuccess(res, settings, 'Settings retrieved successfully');
  }

  // Get setting by key
  async getSettingByKey(req: AuthRequest, res: Response) {
    const setting = await settingsService.getSettingByKey(req.params.key);
    sendSuccess(res, setting, 'Setting retrieved successfully');
  }

  // Create setting
  async createSetting(req: AuthRequest, res: Response) {
    const data: CreateSettingDTO = req.body;
    const setting = await settingsService.createSetting(data, req.user!.userId);
    sendSuccess(res, setting, 'Setting created successfully', 201);
  }

  // Update setting
  async updateSetting(req: AuthRequest, res: Response) {
    const data: UpdateSettingDTO = req.body;
    const setting = await settingsService.updateSetting(
      req.params.key,
      data,
      req.user!.userId,
      req.get('user-agent'),
      req.ip
    );
    sendSuccess(res, setting, 'Setting updated successfully');
  }

  // Delete setting
  async deleteSetting(req: AuthRequest, res: Response) {
    const result = await settingsService.deleteSetting(
      req.params.key,
      req.user!.userId,
      req.get('user-agent'),
      req.ip
    );
    sendSuccess(res, null, result.message);
  }

  // Upsert setting (create or update)
  async upsertSetting(req: AuthRequest, res: Response) {
    const { key } = req.params;
    const { value, type } = req.body;
    
    const setting = await settingsService.upsertSetting(
      key,
      value,
      type || 'string',
      req.user!.userId
    );
    sendSuccess(res, setting, 'Setting saved successfully');
  }

  // Bulk update settings
  async bulkUpdateSettings(req: AuthRequest, res: Response) {
    const data: BulkUpdateSettingsDTO = req.body;
    const settings = await settingsService.bulkUpdateSettings(
      data,
      req.user!.userId,
      req.get('user-agent'),
      req.ip
    );
    sendSuccess(res, settings, 'Settings updated successfully');
  }

  // Get settings count
  async getSettingsCount(req: AuthRequest, res: Response) {
    const count = await settingsService.getSettingsCount();
    sendSuccess(res, { count }, 'Settings count retrieved successfully');
  }
}

export const settingsController = new SettingsController();
