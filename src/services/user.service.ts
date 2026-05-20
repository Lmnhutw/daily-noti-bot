import type { TelegramUser } from "../types/domain.js";
import type { UpsertTelegramUserInput, UserRepository } from "../storage/user.repository.js";

export class UserService {
  constructor(private readonly users: UserRepository) {}

  async upsertTelegramUser(input: UpsertTelegramUserInput): Promise<TelegramUser> {
    return this.users.upsert(input);
  }
}
