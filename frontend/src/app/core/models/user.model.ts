export interface User {
  id: number;
  username: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  userId: number;
  message: string;
}
