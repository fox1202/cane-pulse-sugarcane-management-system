export type UserRole = 'collector' | 'supervisor' | 'admin';

export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    profile_role?: string;
    full_name?: string;
    avatar_url?: string;
    picture?: string;
    image_url?: string;
    photo_url?: string;
    must_change_password?: boolean;
    status: 'pending' | 'approved' | 'rejected';
    user_metadata?: {
        role?: UserRole;
        full_name?: string;
        status?: 'pending' | 'approved' | 'rejected';
        must_change_password?: boolean;
        default_password?: boolean;
        avatar_url?: string;
        picture?: string;
        image_url?: string;
        photo_url?: string;
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
