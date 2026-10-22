// src/services/notification.service.ts
import { prisma } from '../config/database';
import { emitToUser } from '../config/socket';
import { logger } from '../config/logger';
import { NotificationType } from '@prisma/client';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

class NotificationService {
  async create(input: CreateNotificationInput) {
    try {
      const notification = await prisma.notification.create({ data: input });

      // Push real-time via Socket.io
      emitToUser(input.userId, 'notification:new', notification);

      return notification;
    } catch (err) {
      logger.error('Failed to create notification:', err);
    }
  }

  async createBulk(inputs: CreateNotificationInput[]) {
    try {
      const notifications = await prisma.notification.createMany({ data: inputs });
      inputs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
      return notifications;
    } catch (err) {
      logger.error('Failed to create bulk notifications:', err);
    }
  }

  async notifyStudyGroupJoin(groupId: string, joinerId: string): Promise<void> {
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { owner: true },
    });
    const joiner = await prisma.user.findUnique({ where: { id: joinerId } });
    if (!group || !joiner) return;

    if (group.ownerId !== joinerId) {
      await this.create({
        userId: group.ownerId,
        type: 'STUDY_GROUP_JOIN',
        title: 'New member joined',
        body: `${joiner.name} joined your study group "${group.title}"`,
        data: { groupId },
      });
    }
  }

  async notifyCarpoolRequest(carpoolId: string, requesterId: string): Promise<void> {
    const carpool = await prisma.carpool.findUnique({ where: { id: carpoolId } });
    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!carpool || !requester) return;

    await this.create({
      userId: carpool.driverId,
      type: 'CARPOOL_REQUEST',
      title: 'New carpool request',
      body: `${requester.name} wants to join your carpool to ${carpool.destination}`,
      data: { carpoolId },
    });
  }
}

export const notificationService = new NotificationService();
