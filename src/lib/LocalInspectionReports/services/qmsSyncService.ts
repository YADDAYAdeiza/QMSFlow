// @/lib/LocalInspectionReports/services/qmsSyncService.ts
import { sendOversightEmail } from "@/lib/utils/mail";

export interface EmailDispatchItem {
  appNumber: string;
  type: string;
  companyName: string;
  facilityName: string;
  scheduledDate: string;
  notificationEmail?: string;
}

/**
 * Iterates through the compiled email queue and dispatches oversight/scheduling notices.
 * Executed AFTER the main database transaction successfully commits.
 */
export async function dispatchBatchNotifications(queue: EmailDispatchItem[]) {
  if (!queue || queue.length === 0) return;

  for (const item of queue) {
    try {
      await sendOversightEmail({
        appNumber: item.appNumber,
        type: item.type || 'Pre-Registration',
        companyName: item.companyName,
        facilityName: item.facilityName,
        lodRemarks: `Batch inspection scheduled for ${item.scheduledDate}. Team assignments synced and routed to Divisional Deputy Director Schedule Preparation.`,
        customRecipient: item.notificationEmail || undefined,
        emailTitle: "Inspection Batch Scheduled & Routed",
      });
    } catch (emailError) {
      // Log email failure independently so it doesn't break the response flow
      console.error(`Failed to dispatch batch notification email for application ${item.appNumber}:`, emailError);
    }
  }
}