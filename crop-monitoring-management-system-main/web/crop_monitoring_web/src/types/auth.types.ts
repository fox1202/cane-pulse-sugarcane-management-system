export type UserRole = 'collector' | 'supervisor' | 'admin';

export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    full_name?: string;
    status: 'pending' | 'approved' | 'rejected';
    user_metadata?: {
        role?: UserRole;
        full_name?: string;
        status?: 'pending' | 'approved' | 'rejected';
    };
}

export interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}
