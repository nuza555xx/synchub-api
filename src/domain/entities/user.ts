export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
}

export type UserRole = 'admin' | 'editor' | 'moderator' | 'viewer';
