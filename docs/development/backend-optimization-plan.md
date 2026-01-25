# 后端与接口优化计划

## 概述
本文档基于 `optimization-checklist.md` 中的后端优化项，制定详细的实现计划。

---

## 优化项列表

### 1. 补充非流式聊天接口 `POST /chat`

**优先级**: 🔴 高
**难度**: ⭐ 简单
**预期收益**: 提供更灵活的 API 选择，支持不需要流式响应的场景

#### 实现方案
```typescript
// chat.controller.ts
@Post()
async chat(@Body() chatRequest: ChatRequestDto) {
  const character = await this.charactersService.findOne(chatRequest.characterId);

  // 复用 streamChat 逻辑，但收集完整响应
  let fullResponse = '';
  for await (const chunk of this.chatService.streamChat(chatRequest)) {
    fullResponse += chunk;
  }

  return {
    message: fullResponse,
    characterId: chatRequest.characterId,
    timestamp: new Date().toISOString(),
  };
}
```

#### 涉及文件
- `src/chat/chat.controller.ts` - 添加新接口
- `src/chat/dto/chat-response.dto.ts` - 创建响应 DTO

#### 实现步骤
1. 创建 `ChatResponseDto` 类
2. 在 `ChatController` 中添加 `@Post()` 方法
3. 复用现有的 `streamChat` 逻辑，收集完整响应
4. 添加单元测试
5. 更新 API 文档

---

### 2. 管理类接口鉴权 `X-Admin-Secret`

**优先级**: 🟡 中
**难度**: ⭐⭐ 中等
**预期收益**: 保护敏感管理接口，防止未授权访问

#### 实现方案
```typescript
// common/guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminSecret = request.headers['x-admin-secret'];
    const expectedSecret = this.configService.get<string>('ADMIN_SECRET');

    if (!expectedSecret) {
      throw new InternalServerErrorException('ADMIN_SECRET not configured');
    }

    if (adminSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    return true;
  }
}

// 使用示例
@Controller('models')
@UseGuards(AdminGuard)  // 保护整个 ModelsController
export class ModelsController {
  // ...
}
```

#### 涉及文件
- `src/common/guards/admin.guard.ts` - 创建守卫
- `src/models/models.controller.ts` - 应用守卫
- `src/characters/characters.controller.ts` - 应用守卫
- `.env.example` - 添加 `ADMIN_SECRET` 配置项

#### 实现步骤
1. 创建 `AdminGuard` 守卫类
2. 在 `.env` 中添加 `ADMIN_SECRET` 配置
3. 在管理类 Controller 上应用 `@UseGuards(AdminGuard)`
4. 更新前端 API 调用，添加 header
5. 编写测试用例

#### 需要保护的接口
- `POST /models` - 创建模型
- `PUT /models/:id` - 更新模型
- `DELETE /models/:id` - 删除模型
- `POST /characters` - 创建角色
- `PUT /characters/:id` - 更新角色
- `DELETE /characters/:id` - 删除角色

---

### 3. 限流机制

**优先级**: 🟡 中
**难度**: ⭐⭐⭐ 较难
**预期收益**: 防止 API 滥用，保护服务器资源

#### 实现方案
使用 `@nestjs/throttler` 包：

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,      // 1秒
        limit: 3,       // 最多3次请求
      },
      {
        name: 'medium',
        ttl: 10000,     // 10秒
        limit: 20,      // 最多20次请求
      },
      {
        name: 'long',
        ttl: 60000,     // 1分钟
        limit: 100,     // 最多100次请求
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

// 自定义限流装饰器
@Throttle({ short: { limit: 1, ttl: 1000 } })  // 聊天接口：1秒1次
@Post('stream')
async streamChat() {
  // ...
}
```

#### 涉及文件
- `src/app.module.ts` - 配置 ThrottlerModule
- `src/chat/chat.controller.ts` - 应用限流
- `src/common/filters/throttler-exception.filter.ts` - 自定义错误响应

#### 实现步骤
1. 安装依赖：`npm install @nestjs/throttler`
2. 在 `AppModule` 中配置 `ThrottlerModule`
3. 为不同接口设置不同的限流策略
4. 创建自定义异常过滤器，返回友好的错误信息
5. 添加 Redis 存储支持（可选，用于分布式部署）

#### 限流策略建议
| 接口类型 | TTL | Limit | 说明 |
|---------|-----|-------|------|
| 聊天接口 | 1秒 | 1次 | 防止频繁请求 |
| 上传接口 | 10秒 | 5次 | 防止恶意上传 |
| 查询接口 | 1秒 | 10次 | 允许正常浏览 |
| 管理接口 | 1分钟 | 30次 | 管理操作限制 |

---

### 4. 统一错误响应结构

**优先级**: 🔴 高
**难度**: ⭐⭐ 中等
**预期收益**: 提升前端错误处理体验，便于调试

#### 实现方案
```typescript
// common/interfaces/error-response.interface.ts
export interface ErrorResponse {
  success: false;
  error: {
    code: string;           // 错误代码，如 "INVALID_INPUT"
    message: string;        // 用户友好的错误信息
    details?: any;          // 详细错误信息（开发环境）
    timestamp: string;      // 错误发生时间
    path: string;           // 请求路径
  };
}

// common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: this.getErrorCode(exception),
        message: this.getErrorMessage(exception),
        details: process.env.NODE_ENV === 'development'
          ? this.getErrorDetails(exception)
          : undefined,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    response.status(status).json(errorResponse);
  }
}
```

#### 涉及文件
- `src/common/interfaces/error-response.interface.ts` - 错误响应接口
- `src/common/filters/global-exception.filter.ts` - 更新全局异常过滤器
- `src/common/constants/error-code.ts` - 错误代码常量

#### 实现步骤
1. 定义 `ErrorResponse` 接口
2. 更新 `GlobalExceptionFilter`，统一错误格式
3. 创建错误代码枚举
4. 更新所有自定义异常类
5. 前端更新错误处理逻辑

---

### 5. SSE 错误响应统一结构

**优先级**: 🟡 中
**难度**: ⭐⭐ 中等
**预期收益**: 前端能正确处理 SSE 错误

#### 实现方案
```typescript
// chat.controller.ts
@Post('stream')
async streamChat(@Body() chatRequest: ChatRequestDto, @Res() res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const chunk of this.chatService.streamChat(chatRequest)) {
      res.write(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    // 发送错误事件
    const errorEvent = {
      type: 'error',
      error: {
        code: this.getErrorCode(error),
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    };
    res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    res.end();
  }
}
```

#### 涉及文件
- `src/chat/chat.controller.ts` - 更新 SSE 错误处理
- `frontend/src/services/api.js` - 更新前端 SSE 解析

#### 实现步骤
1. 定义 SSE 事件类型（content, error, done）
2. 更新后端 SSE 错误处理
3. 前端解析 SSE 事件类型
4. 测试各种错误场景

---

### 6. SSE 断线重试/恢复机制

**优先级**: 🟢 低
**难度**: ⭐⭐⭐⭐ 困难
**预期收益**: 提升用户体验，网络不稳定时自动恢复

#### 实现方案
```typescript
// 后端：支持 lastEventId
@Post('stream')
async streamChat(
  @Body() chatRequest: ChatRequestDto,
  @Headers('last-event-id') lastEventId: string,
  @Res() res: Response
) {
  // 如果有 lastEventId，从该位置继续
  if (lastEventId) {
    const resumeData = await this.chatService.getResumeData(lastEventId);
    // 发送剩余内容
  }

  let eventId = 0;
  for await (const chunk of this.chatService.streamChat(chatRequest)) {
    res.write(`id: ${eventId}\n`);
    res.write(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`);
    eventId++;
  }
}

// 前端：自动重连
const eventSource = new EventSource('/chat/stream');
eventSource.addEventListener('error', () => {
  // 自动重连，传递 lastEventId
  const lastId = eventSource.lastEventId;
  reconnect(lastId);
});
```

#### 涉及文件
- `src/chat/chat.controller.ts` - 支持 lastEventId
- `src/chat/chat.service.ts` - 实现恢复逻辑
- `frontend/src/services/api.js` - 前端重连逻辑

#### 实现步骤
1. 后端缓存每次 SSE 响应的内容（Redis 或内存）
2. 支持 `last-event-id` header
3. 前端监听 `error` 事件，自动重连
4. 测试断线恢复场景

---

### 7. Token 使用量持久化

**优先级**: 🟡 中
**难度**: ⭐⭐ 中等
**预期收益**: 用户可查看 Token 消耗，便于成本控制

#### 实现方案
```typescript
// entities/token-usage.entity.ts
@Entity('token_usage')
export class TokenUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @Column()
  messageId: number;

  @Column()
  promptTokens: number;

  @Column()
  completionTokens: number;

  @Column()
  totalTokens: number;

  @Column()
  modelId: string;

  @CreateDateColumn()
  createdAt: Date;
}

// chat.service.ts
async *streamChat(chatRequest: ChatRequestDto) {
  // ... 现有逻辑

  // 保存 Token 使用量
  await this.tokenUsageRepository.save({
    sessionId: session.id,
    messageId: message.id,
    promptTokens,
    completionTokens,
    totalTokens,
    modelId,
  });
}
```

#### 涉及文件
- `src/chat/entities/token-usage.entity.ts` - 创建实体
- `src/chat/chat.service.ts` - 保存 Token 数据
- `src/chat/chat.controller.ts` - 添加查询接口
- 数据库迁移文件

#### 实现步骤
1. 创建 `TokenUsage` 实体
2. 在 `streamChat` 中保存 Token 数据
3. 添加查询接口：`GET /chat/sessions/:sessionKey/tokens`
4. 前端显示 Token 统计
5. 添加数据库索引优化查询

---

### 8. 数据库支持 MySQL/SQLite 配置切换

**优先级**: 🟢 低
**难度**: ⭐⭐ 中等
**预期收益**: 支持不同部署环境

#### 实现方案
```typescript
// app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE', 'sqlite');

        if (dbType === 'mysql') {
          return {
            type: 'mysql',
            host: configService.get<string>('DB_HOST'),
            port: configService.get<number>('DB_PORT'),
            username: configService.get<string>('DB_USERNAME'),
            password: configService.get<string>('DB_PASSWORD'),
            database: configService.get<string>('DB_DATABASE'),
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: configService.get<boolean>('DB_SYNC', false),
          };
        }

        // 默认 SQLite
        return {
          type: 'sqlite',
          database: 'database.sqlite',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

#### 涉及文件
- `src/app.module.ts` - 动态数据库配置
- `.env.example` - 添加数据库配置项
- `package.json` - 添加 MySQL 驱动依赖

#### 实现步骤
1. 安装 MySQL 驱动：`npm install mysql2`
2. 更新 `TypeOrmModule` 配置，支持动态切换
3. 在 `.env` 中添加数据库配置
4. 测试 MySQL 和 SQLite 两种模式
5. 更新部署文档

---

## 实施优先级建议

### 第一阶段（立即实施）
1. ✅ 统一错误响应结构（优先级高，影响面广）
2. ✅ 补充非流式聊天接口（优先级高，实现简单）
3. ✅ SSE 错误响应统一结构（配合错误响应结构）

### 第二阶段（近期实施）
4. ✅ 管理类接口鉴权（安全性重要）
5. ✅ 限流机制（防止滥用）
6. ✅ Token 使用量持久化（用户需求）

### 第三阶段（长期优化）
7. ✅ SSE 断线重试/恢复机制（复杂度高）
8. ✅ 数据库支持 MySQL/SQLite 切换（按需实施）

---

## 预期成果

完成所有优化后，系统将具备：
- ✅ 更完善的 API 设计（流式 + 非流式）
- ✅ 更安全的接口保护（鉴权 + 限流）
- ✅ 更友好的错误处理（统一格式 + 详细信息）
- ✅ 更稳定的连接（断线重连）
- ✅ 更透明的成本（Token 统计）
- ✅ 更灵活的部署（多数据库支持）

---

## 附录：技术栈

- **NestJS**: 后端框架
- **TypeORM**: ORM 框架
- **@nestjs/throttler**: 限流
- **class-validator**: 参数验证
- **SQLite/MySQL**: 数据库
- **Redis**: 缓存（可选）

---

## 新增功能需求

### 9. 聊天界面动态切换模型

**优先级**: 🔴 高
**难度**: ⭐⭐ 中等
**预期收益**: 用户可在同一对话中尝试不同模型，对比效果

#### 功能描述
- 在聊天界面添加模型选择器
- 用户可随时切换模型继续对话
- 每条消息记录使用的模型
- 支持查看不同模型的回答对比

#### 实现方案

**后端修改：**

```typescript
// dto/chat-request.dto.ts
export class ChatRequestDto {
  @IsNumber()
  characterId: number;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: string; content: string }>;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  // 新增：可选的模型ID，优先级高于角色默认模型
  @IsOptional()
  @IsString()
  modelId?: string;
}

// chat.service.ts
async *streamChat(chatRequest: ChatRequestDto): AsyncGenerator<string> {
  const character = await this.charactersService.findOne(chatRequest.characterId);

  // 优先使用请求中的 modelId，否则使用角色默认模型
  const modelId = chatRequest.modelId 
    || character.preferredModel 
    || this.configService.get<string>('OPENAI_MODEL') 
    || 'gpt-4o-mini';

  this.logger.log(`使用模型: ${modelId} (${chatRequest.modelId ? '用户选择' : '角色默认'})`);

  // ... 其余逻辑
}

// entities/message.entity.ts
@Entity('messages')
export class Message {
  // ... 现有字段

  @Column({ nullable: true })
  modelId: string;  // 新增：记录使用的模型

  @Column({ nullable: true })
  promptTokens: number;  // 新增：Prompt Token 数

  @Column({ nullable: true })
  completionTokens: number;  // 新增：Completion Token 数
}
```

**前端修改：**

```vue
<!-- Chat.vue -->
<template>
  <div class="chat-page">
    <header class="chat-header">
      <!-- 新增：模型选择器 -->
      <select v-model="selectedModelId" class="model-selector">
        <option value="">使用角色默认模型</option>
        <option v-for="model in enabledModels" :key="model.id" :value="model.modelId">
          {{ model.name }}
        </option>
      </select>
    </header>
    <!-- ... -->
  </div>
</template>

<script setup>
const selectedModelId = ref('')
const enabledModels = ref([])

onMounted(async () => {
  // 加载已启用的模型列表
  enabledModels.value = await getEnabledModels()
})

async function sendMessage() {
  // 发送时携带选中的模型ID
  const response = await streamChat(
    character.value.id,
    inputText.value,
    messages.value,
    uploadedImageUrl.value,
    selectedModelId.value  // 传递模型ID
  )
}
</script>
```

#### 涉及文件
- `src/chat/dto/chat-request.dto.ts` - 添加 modelId 字段
- `src/chat/chat.service.ts` - 支持动态模型选择
- `src/chat/entities/message.entity.ts` - 记录模型信息
- `frontend/src/views/Chat.vue` - 添加模型选择器
- `frontend/src/services/api.js` - 更新 API 调用

#### 实现步骤
1. 更新 Message 实体，添加 modelId 字段
2. 创建数据库迁移
3. 更新 ChatRequestDto，添加可选的 modelId
4. 修改 streamChat 逻辑，支持动态模型
5. 前端添加模型选择器组件
6. 前端加载已启用模型列表
7. 测试模型切换功能

#### 扩展功能
- **模型对比模式**：同时向多个模型发送请求，并排显示结果
- **模型推荐**：根据问题类型自动推荐合适的模型
- **成本显示**：实时显示不同模型的 Token 消耗和成本

---

### 10. 用户登录与认证系统

**优先级**: 🔴 高
**难度**: ⭐⭐⭐ 较难
**预期收益**: 数据隔离、多用户支持、安全性提升

#### 功能描述
- 用户注册/登录
- JWT 认证
- 用户数据隔离（每个用户只能访问自己的角色和会话）
- 支持第三方登录（可选）

#### 实现方案

**数据库设计：**

```typescript
// entities/user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;  // bcrypt 加密

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 'user' })
  role: string;  // user, admin

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 关联关系
  @OneToMany(() => Character, character => character.user)
  characters: Character[];

  @OneToMany(() => Session, session => session.user)
  sessions: Session[];
}

// 更新现有实体
@Entity('characters')
export class Character {
  // ... 现有字段

  @Column()
  userId: number;

  @ManyToOne(() => User, user => user.characters)
  user: User;
}

@Entity('sessions')
export class Session {
  // ... 现有字段

  @Column()
  userId: number;

  @ManyToOne(() => User, user => user.sessions)
  user: User;
}
```

**认证模块：**

```typescript
// auth/auth.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

// auth/auth.service.ts
@Injectable()
export class AuthService {
  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      username: registerDto.username,
    });
    return this.usersRepository.save(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      },
    };
  }

  async validateUser(userId: number) {
    return this.usersRepository.findOne({ where: { id: userId } });
  }
}

// auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

// auth/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**接口保护：**

```typescript
// characters.controller.ts
@Controller('characters')
@UseGuards(JwtAuthGuard)  // 保护所有接口
export class CharactersController {
  @Get()
  findAll(@Request() req) {
    // 只返回当前用户的角色
    return this.charactersService.findByUserId(req.user.id);
  }

  @Post()
  create(@Body() createDto: CreateCharacterDto, @Request() req) {
    // 创建时自动关联当前用户
    return this.charactersService.create({
      ...createDto,
      userId: req.user.id,
    });
  }
}
```

**前端实现：**

```vue
<!-- Login.vue -->
<template>
  <div class="login-page">
    <form @submit.prevent="handleLogin">
      <input v-model="email" type="email" placeholder="邮箱" required />
      <input v-model="password" type="password" placeholder="密码" required />
      <button type="submit">登录</button>
    </form>
    <router-link to="/register">还没有账号？注册</router-link>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../services/api'

const router = useRouter()
const email = ref('')
const password = ref('')

async function handleLogin() {
  try {
    const { access_token, user } = await login(email.value, password.value)
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(user))
    router.push('/')
  } catch (error) {
    alert('登录失败：' + error.message)
  }
}
</script>

// services/api.js
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('登录失败')
  return res.json()
}

// 在所有 API 请求中添加 Authorization header
const token = localStorage.getItem('token')
if (token) {
  headers['Authorization'] = `Bearer ${token}`
}
```

#### 涉及文件
- `src/auth/*` - 新建认证模块
- `src/users/*` - 新建用户模块
- `src/entities/user.entity.ts` - 用户实体
- `src/characters/characters.service.ts` - 添加用户过滤
- `src/chat/chat.service.ts` - 添加用户过滤
- `frontend/src/views/Login.vue` - 登录页面
- `frontend/src/views/Register.vue` - 注册页面
- `frontend/src/router/index.js` - 路由守卫

#### 实现步骤
1. 安装依赖：`npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt`
2. 创建 User 实体和数据库迁移
3. 创建 AuthModule、AuthService、AuthController
4. 实现 JWT 策略和守卫
5. 更新现有实体，添加 userId 外键
6. 更新所有 Service，添加用户过滤
7. 前端创建登录/注册页面
8. 前端添加路由守卫
9. 前端在所有请求中添加 JWT token
10. 测试完整的认证流程

#### 扩展功能
- **第三方登录**：支持 Google、GitHub OAuth
- **邮箱验证**：注册时发送验证邮件
- **密码重置**：忘记密码功能
- **用户资料**：个人信息管理
- **多设备登录**：支持多设备同时登录

---

### 11. 长期记忆系统

**优先级**: 🟡 中
**难度**: ⭐⭐⭐⭐ 困难
**预期收益**: AI 能记住用户信息，提供更个性化的对话体验

#### 功能描述
- **短期记忆**：当前会话的上下文（已实现）
- **长期记忆**：跨会话的重要信息
- **记忆检索**：根据当前对话自动检索相关记忆
- **记忆管理**：用户可查看、编辑、删除记忆

#### 实现方案

**方案A：基于向量数据库（推荐）**

```typescript
// entities/memory.entity.ts
@Entity('memories')
export class Memory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  characterId: number;

  @Column('text')
  content: string;  // 记忆内容

  @Column('text', { nullable: true })
  embedding: string;  // 向量嵌入（JSON 字符串）

  @Column({ default: 1.0 })
  importance: number;  // 重要性评分 0-1

  @Column({ nullable: true })
  category: string;  // 分类：personal_info, preference, event, etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// memory/memory.service.ts
@Injectable()
export class MemoryService {
  constructor(
    @InjectRepository(Memory)
    private memoryRepository: Repository<Memory>,
    private openaiService: OpenAIService,
  ) {}

  /**
   * 从对话中提取记忆
   */
  async extractMemories(
    userId: number,
    characterId: number,
    conversation: string,
  ): Promise<Memory[]> {
    // 使用 LLM 提取重要信息
    const prompt = `
从以下对话中提取值得长期记住的信息，如用户的个人信息、偏好、重要事件等。
以 JSON 数组格式返回，每个记忆包含：content（内容）、importance（重要性0-1）、category（分类）

对话内容：
${conversation}

返回格式：
[
  {"content": "用户喜欢喝咖啡", "importance": 0.7, "category": "preference"},
  {"content": "用户的生日是5月20日", "importance": 0.9, "category": "personal_info"}
]
`;

    const response = await this.openaiService.chat(prompt);
    const memories = JSON.parse(response);

    // 生成向量嵌入
    const savedMemories = [];
    for (const mem of memories) {
      const embedding = await this.openaiService.createEmbedding(mem.content);
      const memory = this.memoryRepository.create({
        userId,
        characterId,
        content: mem.content,
        embedding: JSON.stringify(embedding),
        importance: mem.importance,
        category: mem.category,
      });
      savedMemories.push(await this.memoryRepository.save(memory));
    }

    return savedMemories;
  }

  /**
   * 检索相关记忆
   */
  async retrieveRelevantMemories(
    userId: number,
    characterId: number,
    query: string,
    limit: number = 5,
  ): Promise<Memory[]> {
    // 生成查询向量
    const queryEmbedding = await this.openaiService.createEmbedding(query);

    // 获取所有记忆
    const allMemories = await this.memoryRepository.find({
      where: { userId, characterId },
    });

    // 计算余弦相似度
    const memoriesWithScore = allMemories.map(memory => {
      const memEmbedding = JSON.parse(memory.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, memEmbedding);
      return { memory, score: similarity * memory.importance };
    });

    // 按相关性排序并返回 top-k
    return memoriesWithScore
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.memory);
  }

  /**
   * 余弦相似度计算
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// chat.service.ts - 集成记忆系统
async *streamChat(chatRequest: ChatRequestDto): AsyncGenerator<string> {
  // ... 现有逻辑

  // 检索相关记忆
  const relevantMemories = await this.memoryService.retrieveRelevantMemories(
    userId,
    chatRequest.characterId,
    chatRequest.message,
    5,
  );

  // 将记忆注入到 system prompt
  if (relevantMemories.length > 0) {
    const memoryContext = relevantMemories
      .map(m => `- ${m.content}`)
      .join('\n');

    systemPrompt += `\n\n你对用户的记忆：\n${memoryContext}\n\n请在对话中自然地运用这些记忆。`;
  }

  // ... 继续对话逻辑

  // 对话结束后，提取新记忆
  const conversation = `用户: ${chatRequest.message}\nAI: ${fullResponse}`;
  await this.memoryService.extractMemories(
    userId,
    chatRequest.characterId,
    conversation,
  );
}
```

**方案B：使用专业向量数据库（Pinecone/Qdrant）**

```typescript
// 使用 Pinecone
import { PineconeClient } from '@pinecone-database/pinecone';

@Injectable()
export class MemoryService {
  private pinecone: PineconeClient;
  private index: any;

  async onModuleInit() {
    this.pinecone = new PineconeClient();
    await this.pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
    });
    this.index = this.pinecone.Index('memories');
  }

  async storeMemory(userId: number, characterId: number, content: string) {
    const embedding = await this.openaiService.createEmbedding(content);
    await this.index.upsert({
      upsertRequest: {
        vectors: [
          {
            id: `${userId}-${characterId}-${Date.now()}`,
            values: embedding,
            metadata: { userId, characterId, content },
          },
        ],
      },
    });
  }

  async retrieveMemories(userId: number, characterId: number, query: string) {
    const queryEmbedding = await this.openaiService.createEmbedding(query);
    const results = await this.index.query({
      queryRequest: {
        vector: queryEmbedding,
        topK: 5,
        filter: { userId, characterId },
        includeMetadata: true,
      },
    });
    return results.matches.map(match => match.metadata.content);
  }
}
```

#### 涉及文件
- `src/memory/*` - 新建记忆模块
- `src/memory/entities/memory.entity.ts` - 记忆实体
- `src/memory/memory.service.ts` - 记忆服务
- `src/memory/memory.controller.ts` - 记忆管理接口
- `src/chat/chat.service.ts` - 集成记忆检索
- `frontend/src/views/MemoryManagement.vue` - 记忆管理页面

#### 实现步骤

**阶段1：基础实现**
1. 创建 Memory 实体和数据库迁移
2. 实现记忆提取逻辑（使用 LLM）
3. 实现简单的关键词匹配检索
4. 在对话中注入相关记忆
5. 测试基本功能

**阶段2：向量检索**
6. 集成 OpenAI Embeddings API
7. 实现向量相似度计算
8. 优化记忆检索算法
9. 添加记忆重要性评分

**阶段3：高级功能**
10. 记忆自动归档（低重要性记忆定期清理）
11. 记忆冲突检测（新旧信息矛盾时提示）
12. 记忆可视化（前端展示记忆图谱）
13. 用户手动管理记忆

#### 技术选型

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 本地向量计算 | 简单、免费 | 性能较差、扩展性差 | 小规模、原型验证 |
| Pinecone | 性能好、易用 | 收费、依赖第三方 | 生产环境、大规模 |
| Qdrant | 开源、可自部署 | 需要额外部署 | 中等规模、私有化 |
| PostgreSQL + pgvector | 集成度高 | 性能一般 | 已有 PG 数据库 |

**推荐方案**：
- 初期：本地向量计算（快速验证）
- 中期：Pinecone（快速上线）
- 长期：Qdrant 自部署（成本优化）

#### 扩展功能
- **记忆图谱**：可视化用户信息网络
- **记忆分享**：不同角色共享记忆
- **记忆导出**：导出为 Markdown/JSON
- **记忆统计**：分析用户画像

---

## 更新后的实施优先级

### 🔴 第一阶段（立即实施）- 核心功能
1. **用户登录与认证系统** ⭐⭐⭐ - 数据安全基础
2. **聊天界面动态切换模型** ⭐⭐ - 用户体验提升
3. **统一错误响应结构** ⭐⭐ - 开发体验优化

### 🟡 第二阶段（近期实施）- 安全与性能
4. **管理类接口鉴权** ⭐⭐ - 配合登录系统
5. **限流机制** ⭐⭐⭐ - 防止滥用
6. **Token 使用量持久化** ⭐⭐ - 成本透明
7. **补充非流式聊天接口** ⭐ - API 完善

### 🟢 第三阶段（长期优化）- 高级功能
8. **长期记忆系统（基础版）** ⭐⭐⭐⭐ - 核心竞争力
9. **SSE 错误响应统一** ⭐⭐ - 错误处理完善
10. **SSE 断线重试机制** ⭐⭐⭐⭐ - 稳定性提升
11. **数据库 MySQL 支持** ⭐⭐ - 生产环境需求

### 🔵 第四阶段（未来规划）- 增强功能
12. **长期记忆系统（向量版）** ⭐⭐⭐⭐ - 性能优化
13. **模型对比模式** ⭐⭐⭐ - 高级功能
14. **第三方登录** ⭐⭐ - 用户体验
15. **记忆可视化** ⭐⭐⭐ - 数据洞察

---

## 技术栈更新

### 后端新增
- **@nestjs/jwt** - JWT 认证
- **@nestjs/passport** - 认证策略
- **bcrypt** - 密码加密
- **@pinecone-database/pinecone** - 向量数据库（可选）
- **openai** - Embeddings API

### 前端新增
- **vue-router** - 路由守卫
- **pinia** - 状态管理（用户信息）
- **echarts** - 记忆可视化（可选）

---

## 预期成果（更新）

完成所有优化后，系统将具备：
- ✅ **多用户支持**：完整的用户认证和数据隔离
- ✅ **灵活的模型选择**：随时切换模型，对比效果
- ✅ **长期记忆能力**：AI 能记住用户信息，提供个性化体验
- ✅ **完善的 API 设计**：流式 + 非流式，统一错误处理
- ✅ **安全的接口保护**：JWT 认证 + 限流机制
- ✅ **稳定的连接**：断线重连，容错能力强
- ✅ **透明的成本**：Token 统计，成本可控
- ✅ **灵活的部署**：多数据库支持，可扩展架构

