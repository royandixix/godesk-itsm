export interface TicketAttachment {
  id: number;
  ticket_id: number;
  uploaded_by: number;
  uploader_name: string;
  original_name: string;
  mime_type: string;
  file_extension: string | null;
  size_bytes: number;
  created_at: string;
}

export interface AttachmentListResponse {
  data: TicketAttachment[];
}

export interface AttachmentUploadResponse {
  data: TicketAttachment;
  message: string;
}

export interface AttachmentDeleteResponse {
  message: string;
}
