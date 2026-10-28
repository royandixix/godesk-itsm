import type { TicketPriority, TicketStatus } from "@/lib/types/ticket";
import type { UserRole } from "@/lib/types/auth";
export interface DashboardStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  customers: number;
}
export interface DashboardPriorityStats {
  low: number;
  medium: number;
  high: number;
  urgent: number;
}
export interface DashboardMonthlyItem {
  month: number;
  total: number;
}
export interface DashboardRecentTicket {
  id: number;
  ticket_number: string;
  subject: string;
  customer_name: string;
  category_name: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
}
export interface DashboardData {
  role: UserRole;
  year: number;
  stats: DashboardStats;
  priorities: DashboardPriorityStats;
  monthly: DashboardMonthlyItem[];
  recent_tickets: DashboardRecentTicket[];
}
export interface DashboardResponse {
  data: DashboardData;
}
