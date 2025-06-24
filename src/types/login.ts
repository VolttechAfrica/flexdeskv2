import { User} from '@/types/user.js';

export interface Login {
    email: string;
    password: string;
}

export interface LoginResponse {
    status: boolean;
    message: string;
    data?: User;
    error?: string;
    token?: string;
}
