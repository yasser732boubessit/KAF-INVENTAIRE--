import { AppUser, UserRole } from './permissions';

export class CryptoSecurity {
  private static getCryptoAPI(): Crypto {
    const g: any = globalThis;
    if (g.crypto && g.crypto.subtle) return g.crypto;
    if (g.msCrypto && g.msCrypto.subtle) return g.msCrypto;
    throw new Error('Web Crypto API indisponible');
  }

  public static async hashPassword(
    password: string,
    salt: string = 'KAF_SALT_2026_ENTERPRISE'
  ): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('hashPassword: password invalide');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const cryptoAPI = this.getCryptoAPI();
    const hashBuffer = await cryptoAPI.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public static async verifyPassword(
    password: string,
    hash: string,
    salt: string = 'KAF_SALT_2026_ENTERPRISE'
  ): Promise<boolean> {
    if (!password || !hash) return false;
    const computed = await this.hashPassword(password, salt);
    return computed === hash;
  }
}