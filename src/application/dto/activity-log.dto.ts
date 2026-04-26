export interface ActivityLogOutput {
  id: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export interface ActivityLogListOutput {
  items: ActivityLogOutput[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ListActivityLogsInput {
  page?: number;
  limit?: number;
  action?: string;
}

export interface CreateActivityLogInput {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}
