import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { apiFetch, getAccessToken, UPLOAD_API } from '../api/client';
import type { CreateUploadResponse, UploadStatus, UploadStatusResponse } from '../api/types';
import { Ticket } from './Ticket';
import type { TicketState } from './Ticket';

const STATUS_LABELS: Record<UploadStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  failed_partial: 'Completed, some rows skipped',
  failed: 'Failed',
};

const TERMINAL_STATUSES: UploadStatus[] = ['completed', 'failed_partial', 'failed'];

export function UploadPanel({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [tickets, setTickets] = useState<TicketState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // ✅ Best Practice: clear every in-flight poller on unmount — otherwise
  // navigating away mid-upload leaves setInterval callbacks running against
  // a component that no longer exists.
  useEffect(() => {
    const intervals = pollIntervals.current;
    return () => {
      intervals.forEach((id) => clearInterval(id));
      intervals.clear();
    };
  }, []);

  const updateTicket = useCallback((id: string, patch: Partial<TicketState>) => {
    setTickets((current) => current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const pollUploadStatus = useCallback(
    (uploadId: string) => {
      let attempts = 0;
      const intervalId = setInterval(() => {
        attempts += 1;
        apiFetch<UploadStatusResponse>(UPLOAD_API, `/uploads/${uploadId}`)
          .then((upload) => {
            if (TERMINAL_STATUSES.includes(upload.status)) {
              clearInterval(intervalId);
              pollIntervals.current.delete(uploadId);
              const detail =
                upload.status === 'failed'
                  ? 'Failed — no rows could be read'
                  : `${STATUS_LABELS[upload.status]} · ${upload.rowsProcessed} rows, ${upload.rowsRejected} skipped`;
              updateTicket(uploadId, { status: upload.status, detail, justCompleted: true });
              onUploadComplete();
            } else {
              updateTicket(uploadId, { status: upload.status, detail: undefined });
            }
          })
          .catch(() => {
            /* transient errors are fine — the next poll tick will try again */
          });

        if (attempts > 60) clearInterval(intervalId); // ~2 minutes at 2s intervals
      }, 2000);
      pollIntervals.current.set(uploadId, intervalId);
    },
    [onUploadComplete, updateTicket]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const tempId = `pending-${Date.now()}`;
      setTickets((current) => [{ id: tempId, filename: file.name, status: 'queued' }, ...current]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${UPLOAD_API}/uploads`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
          body: formData,
        });
        const data = (await res.json()) as CreateUploadResponse & { message?: string };
        if (!res.ok) throw new Error(data.message ?? 'Upload failed');

        setTickets((current) =>
          current.map((t) =>
            t.id === tempId ? { id: data.uploadId, filename: file.name, status: data.status } : t
          )
        );
        pollUploadStatus(data.uploadId);
      } catch (err) {
        updateTicket(tempId, {
          status: 'failed',
          detail: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    },
    [pollUploadStatus, updateTicket]
  );

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Upload sales CSV</h2>
      <div
        className={`dropzone${isDragOver ? ' is-dragover' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload a CSV file"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <p className="dropzone-text">
          Drag a CSV here, or <span className="dropzone-browse">browse</span>
        </p>
        <p className="dropzone-hint">Date, product, quantity, amount columns — any header names work.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="ticket-list" aria-live="polite">
        {tickets.map((ticket) => (
          <Ticket key={ticket.id} {...ticket} />
        ))}
      </div>
    </section>
  );
}
