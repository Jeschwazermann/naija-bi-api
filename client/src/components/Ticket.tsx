import type { UploadStatus } from '../api/types';

const STATUS_LABELS: Record<UploadStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  failed_partial: 'Completed, some rows skipped',
  failed: 'Failed',
};

export interface TicketState {
  id: string;
  filename: string;
  status: UploadStatus;
  detail?: string;
  justCompleted?: boolean;
}

export function Ticket({ filename, status, detail, justCompleted }: TicketState) {
  return (
    <div className={`ticket${justCompleted ? ' is-stamped' : ''}`}>
      <span className="ticket-name">{filename}</span>
      <span className={`ticket-status status-${status}`}>{detail ?? STATUS_LABELS[status]}</span>
    </div>
  );
}
