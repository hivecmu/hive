import { compare, hash } from 'bcrypt';
import { sign, SignOptions } from 'jsonwebtoken';
import { db } from '@infra/db/client';
import config from '@config/index';
import { Result, Ok, Err, Issues, Issue } from '@shared/types/Result';
import type { UUID } from '@shared/types/common';

/**
 * User entity
 */
export interface User {
  id: UUID;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User with password (internal only)
 */
interface UserRow extends User {
  password_hash: string;
}

/**
 * Registration input
 */
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

/**
 * Login input
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Auth response
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * User Service
 * Handles user authentication and management
 *
 * AF: Maps database user rows to User entities with authentication
 * RI:
 *   - email must be unique
 *   - password_hash is bcrypt hashed
 *   - tokens are valid JWT
 * Safety: Never exposes password_hash
 */
export class UserService {
  private readonly SALT_ROUNDS = 10;

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<Result<AuthResponse, Issue>> {
    try {
      // Check if email already exists
      const existingUser = await db.query<UserRow>(
        'SELECT id FROM users WHERE email = $1',
        [input.email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return Err([Issues.conflict('Email already registered')]);
      }

      // Hash password
      const passwordHash = await hash(input.password, this.SALT_ROUNDS);

      // Create user
      const result = await db.query<UserRow>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, avatar_url, created_at, updated_at`,
        [input.email.toLowerCase(), passwordHash, input.name]
      );

      const userRow = result.rows[0];
      const user = this.rowToUser(userRow);

      // Generate JWT
      const token = this.generateToken(user);

      return Ok({ user, token });
    } catch (error) {
      return Err([Issues.internal('Failed to register user')]);
    }
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<Result<AuthResponse, Issue>> {
    try {
      // Find user by email
      const result = await db.query<UserRow>(
        `SELECT id, email, name, avatar_url, password_hash, created_at, updated_at
         FROM users
         WHERE email = $1`,
        [input.email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return Err([Issues.unauthorized('Invalid email or password')]);
      }

      const userRow = result.rows[0];

      // Verify password
      const isValid = await compare(input.password, userRow.password_hash);

      if (!isValid) {
        return Err([Issues.unauthorized('Invalid email or password')]);
      }

      const user = this.rowToUser(userRow);
      const token = this.generateToken(user);

      return Ok({ user, token });
    } catch (error) {
      return Err([Issues.internal('Failed to login')]);
    }
  }

  /**
   * Get user by ID
   */
  async getById(userId: UUID): Promise<Result<User, Issue>> {
    try {
      const result = await db.query<UserRow>(
        `SELECT id, email, name, avatar_url, created_at, updated_at
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return Err([Issues.notFound('User', userId)]);
      }

      const user = this.rowToUser(result.rows[0]);
      return Ok(user);
    } catch (error) {
      return Err([Issues.internal('Failed to get user')]);
    }
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
    };

    const options: SignOptions = {
      expiresIn: config.jwtExpiresIn as any, // Type assertion for string expiry format like '24h'
    };

    return sign(payload, config.jwtSecret, options);
  }

  /**
   * Convert database row to User entity
   * Safety: Strips password_hash
   */
  private rowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url || null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const userService = new UserService();
