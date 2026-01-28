import * as crypto from 'crypto';

// 延迟获取加密密钥，避免在模块加载时就检查
function getEncryptionKey(): Buffer {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  if (!ENCRYPTION_KEY) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
        'Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"',
    );
  }

  // 确保密钥长度正确（32字节 = 64个十六进制字符）
  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
        'Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"',
    );
  }

  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

const IV_LENGTH = 16; // AES块大小

/**
 * 加密文本
 * @param text 要加密的明文
 * @returns 加密后的文本（格式：iv:encryptedData）
 */
export function encrypt(text: string): string {
  const KEY_BUFFER = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY_BUFFER, iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * 解密文本
 * @param text 加密的文本（格式：iv:encryptedData）
 * @returns 解密后的明文
 */
export function decrypt(text: string): string {
  const KEY_BUFFER = getEncryptionKey();
  const parts = text.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY_BUFFER, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * 脱敏显示API Key（只显示前4后4字符）
 * @param apiKey API Key
 * @returns 脱敏后的字符串
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '****';
  }
  return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
}
