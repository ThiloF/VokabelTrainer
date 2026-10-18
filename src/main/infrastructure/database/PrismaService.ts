import { singleton } from 'tsyringe'
import { PrismaClient } from '@prisma/client'

@singleton()
export class PrismaService {
  public readonly client: PrismaClient

  constructor() {
    this.client = new PrismaClient()
  }

  public async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      await this.client.$queryRaw`SELECT 1`
      return { connected: true }
    } catch (err: any) {
      return {
        connected: false,
        error: err?.message ?? 'Keine Verbindung zu PostgreSQL möglich.'
      }
    }
  }
}
