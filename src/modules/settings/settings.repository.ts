import { prisma } from '../../config/database';
import { CreateSettingDTO, UpdateSettingDTO, SettingType } from './settings.types';

export class SettingsRepository {
  // Find all settings
  async findAll() {
    return prisma.setting.findMany({
      include: {
        updatedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        key: 'asc',
      },
    });
  }

  // Find setting by key
  async findByKey(key: string) {
    return prisma.setting.findUnique({
      where: { key },
      include: {
        updatedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Create setting
  async create(data: CreateSettingDTO, userId: string) {
    return prisma.setting.create({
      data: {
        ...data,
        updatedById: userId,
      },
      include: {
        updatedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Update setting
  async update(key: string, data: UpdateSettingDTO, userId: string) {
    return prisma.setting.update({
      where: { key },
      data: {
        ...data,
        updatedById: userId,
        updatedAt: new Date(),
      },
      include: {
        updatedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Upsert setting (create or update)
  async upsert(key: string, value: string, type: SettingType, userId: string) {
    return prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value,
        type,
        updatedById: userId,
      },
      update: {
        value,
        type,
        updatedById: userId,
        updatedAt: new Date(),
      },
      include: {
        updatedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Delete setting
  async delete(key: string) {
    return prisma.setting.delete({
      where: { key },
    });
  }

  // Bulk upsert settings
  async bulkUpsert(
    settings: Array<{ key: string; value: string; type: SettingType }>,
    userId: string
  ) {
    const operations = settings.map((setting) =>
      prisma.setting.upsert({
        where: { key: setting.key },
        create: {
          key: setting.key,
          value: setting.value,
          type: setting.type,
          updatedById: userId,
        },
        update: {
          value: setting.value,
          type: setting.type,
          updatedById: userId,
          updatedAt: new Date(),
        },
      })
    );

    return prisma.$transaction(operations);
  }

  // Count all settings
  async count() {
    return prisma.setting.count();
  }
}

export const settingsRepository = new SettingsRepository();
