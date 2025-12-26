export interface User {
  id: string
  username: string
  email: string
  password: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserInput {
  username: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthResponse {
  user: {
    id: string
    username: string
    email: string
    createdAt: Date
  }
  token: string
}

export interface JWTPayload {
  userId: string
  email: string
}