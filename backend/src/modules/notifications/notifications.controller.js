import { NotificationsService } from './notifications.service.js';

export class NotificationsController {
  static async list(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      const { unreadOnly, limit } = req.query;
      const result = await NotificationsService.listNotifications(orgId, userId, {
        unreadOnly: unreadOnly === 'true',
        limit,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async markRead(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      const { id } = req.params;
      const success = await NotificationsService.markAsRead(orgId, userId, id);
      res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
      next(err);
    }
  }

  static async markAllRead(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      const count = await NotificationsService.markAllAsRead(orgId, userId);
      res.status(200).json({ success: true, count, message: `${count} notifications marked as read` });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      const { id } = req.params;
      const deleted = await NotificationsService.deleteNotification(orgId, userId, id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Notification not found' });
      res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (err) {
      next(err);
    }
  }
}
