import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ModelsService } from './models/models.service';
import { ConfigService } from '@nestjs/config';

/**
 * 从环境变量导入模型配置到数据库
 *
 * 使用方法：
 * npm run import-env-model
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const modelsService = app.get(ModelsService);
  const configService = app.get(ConfigService);

  console.log('🚀 开始从环境变量导入模型配置...\n');

  // 读取环境变量
  const apiKey = configService.get<string>('OPENAI_API_KEY');
  const baseURL = configService.get<string>('OPENAI_BASE_URL');
  const modelId = configService.get<string>('OPENAI_MODEL');

  if (!apiKey || !baseURL || !modelId) {
    console.error('❌ 环境变量配置不完整！');
    console.error('请确保 .env 文件中包含以下配置：');
    console.error('  - OPENAI_API_KEY');
    console.error('  - OPENAI_BASE_URL');
    console.error('  - OPENAI_MODEL');
    await app.close();
    process.exit(1);
  }

  console.log('📋 读取到的环境变量配置：');
  console.log(`  API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`  Base URL: ${baseURL}`);
  console.log(`  Model ID: ${modelId}\n`);

  // 检查模型是否已存在
  const existingModel = await modelsService.findByModelId(modelId);
  if (existingModel) {
    console.log(`⚠️  模型 "${modelId}" 已存在于数据库中`);
    console.log('如需更新，请先在模型管理页面删除该模型\n');
    await app.close();
    return;
  }

  // 根据 Base URL 推断厂商和名称
  let provider = 'openai';
  let name = modelId;

  if (baseURL.includes('deepseek')) {
    provider = 'deepseek';
    name = 'DeepSeek Chat';
  } else if (baseURL.includes('bigmodel.cn')) {
    provider = 'zhipu';
    name = 'GLM-4.7-Flash';
  } else if (baseURL.includes('modelscope')) {
    provider = 'zhipu';
    name = 'GLM-4.7-Flash (ModelScope)';
  } else if (baseURL.includes('anthropic')) {
    provider = 'anthropic';
    name = 'Claude';
  } else if (baseURL.includes('google')) {
    provider = 'google';
    name = 'Gemini';
  }

  // 创建模型配置
  try {
    const model = await modelsService.create({
      name,
      modelId,
      provider,
      apiKey,
      baseURL,
      isEnabled: true,
      defaultTemperature: 0.7,
      defaultMaxTokens: 2000,
      description: `从环境变量自动导入的模型配置`,
      sortOrder: 0,
    });

    console.log('✅ 模型配置导入成功！\n');
    console.log('📊 导入的模型信息：');
    console.log(`  ID: ${model.id}`);
    console.log(`  名称: ${name}`);
    console.log(`  模型 ID: ${modelId}`);
    console.log(`  厂商: ${provider}`);
    console.log(`  Base URL: ${baseURL}`);
    console.log(`  状态: 已启用\n`);

    console.log('💡 提示：');
    console.log('  1. 现在可以在模型管理页面查看和编辑该模型');
    console.log('  2. 可以在角色配置中选择该模型作为默认模型');
    console.log('  3. 建议在模型管理页面测试连接是否正常\n');
  } catch (error) {
    console.error('❌ 导入失败：', error.message);
    console.error(error);
  }

  await app.close();
}

bootstrap();
