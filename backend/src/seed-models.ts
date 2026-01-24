import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 加密函数（与encryption.util.ts保持一致）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be set and be 64 hex characters');
}
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY_BUFFER, iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 初始模型配置（示例数据，请根据实际情况修改API Key）
const initialModels = [
  {
    name: 'DeepSeek Chat - 高性价比',
    modelId: 'deepseek-chat',
    provider: 'deepseek',
    apiKey: 'your-deepseek-api-key-here', // 请替换为真实的API Key
    baseURL: 'https://api.deepseek.com/v1',
    isEnabled: true,
    defaultTemperature: 0.7,
    defaultMaxTokens: 2000,
    description: '高性价比的对话模型，适合日常对话',
    sortOrder: 1,
  },
  {
    name: 'GPT-4o Mini - OpenAI',
    modelId: 'gpt-4o-mini',
    provider: 'openai',
    apiKey: 'your-openai-api-key-here', // 请替换为真实的API Key
    baseURL: 'https://api.openai.com/v1',
    isEnabled: false,
    defaultTemperature: 0.7,
    defaultMaxTokens: 2000,
    description: 'OpenAI的高性价比模型',
    sortOrder: 2,
  },
  {
    name: 'Claude Sonnet 4.5 - Anthropic',
    modelId: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    apiKey: 'your-anthropic-api-key-here', // 请替换为真实的API Key
    baseURL: 'https://api.anthropic.com/v1',
    isEnabled: false,
    defaultTemperature: 0.7,
    defaultMaxTokens: 2000,
    description: 'Anthropic的高性能模型',
    sortOrder: 3,
  },
];

async function seedModels() {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: process.env.DATABASE_PATH || 'database.sqlite',
    entities: ['src/**/entities/*.entity.ts'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const queryRunner = dataSource.createQueryRunner();

    for (const model of initialModels) {
      // 检查模型是否已存在
      const existing = await queryRunner.query(
        'SELECT * FROM models WHERE modelId = ?',
        [model.modelId]
      );

      if (existing.length > 0) {
        console.log(`模型 ${model.modelId} 已存在，跳过`);
        continue;
      }

      // 加密API Key
      const encryptedApiKey = encrypt(model.apiKey);

      // 插入模型
      await queryRunner.query(
        `INSERT INTO models (name, modelId, provider, apiKey, baseURL, isEnabled, defaultTemperature, defaultMaxTokens, description, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          model.name,
          model.modelId,
          model.provider,
          encryptedApiKey,
          model.baseURL,
          model.isEnabled ? 1 : 0,
          model.defaultTemperature,
          model.defaultMaxTokens,
          model.description,
          model.sortOrder,
        ]
      );

      console.log(`✅ 已添加模型: ${model.name}`);
    }

    await queryRunner.release();
    console.log('\n✅ 模型数据初始化完成！');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// 运行脚本
seedModels().catch(console.error);
