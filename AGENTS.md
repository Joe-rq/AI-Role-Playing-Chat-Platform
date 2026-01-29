# AGENTS.md - AI Agent Guidelines

Essential information for AI agents working on this repository.

## Project Structure

Full-stack AI role-playing chat platform:
- **Backend**: NestJS (TypeScript), SQLite (TypeORM), OpenAI API, Mem0.ai memory
- **Frontend**: Vue 3 (Composition API), Vite, Markdown rendering

## Commands

### Backend (in `backend/` directory)

```bash
npm run start:dev              # Start with hot-reload
npm run build                  # Compile TypeScript to dist/
npm run format                 # Format code with Prettier
npm run lint                   # Run ESLint with auto-fix
npm run test                   # Run all tests
npm run test:watch             # Watch mode
npm run test:cov               # Coverage report
npm run test:e2e              # E2E tests

# Single test
npm run test -- chat.service.spec.ts
npm run test -- --testPathPattern=chat

# Seed data
npm run seed:characters        # Seed character data
npm run import-env-model       # Import model from env
```

### Frontend (in `frontend/` directory)

```bash
npm run dev                    # Start Vite dev server (http://localhost:5173)
npm run build                  # Build for production
npm run preview                # Preview production build
```

## Code Style Guidelines

### TypeScript/Backend

**Imports:** Core NestJS → External libraries → Internal → Type imports
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Character } from './entities/character.entity';
import type { CharacterDto } from './dto/character.dto';
```

**Formatting:** `.prettierrc`: single quotes `true`, trailing comma `all`

**Naming:**
- Classes/Interfaces: `PascalCase` (e.g., `CharacterService`)
- Methods/Variables: `camelCase` (e.g., `findAll`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_HISTORY_TURNS`)
- Private members: `camelCase` (no underscore prefix)
- Files: `kebab-case` (e.g., `character.service.ts`)

**DTOs & Validation:**
```typescript
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateCharacterDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
```

**Error Handling:**
```typescript
// Use BusinessException for business logic errors
import { BusinessException, ErrorCode } from '@/common';

throw new BusinessException(
  ErrorCode.CHARACTER_NOT_FOUND,
  `角色 ID ${id} 不存在`,
);

// NestJS Logger (not console.log)
private readonly logger = new Logger(CharacterService.name);
this.logger.log('Operation completed');
this.logger.error('Operation failed', error);
```

**TypeORM Entities:**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('characters')
export class Character {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'text' }) systemPrompt: string;
  @Column({ nullable: true, default: 'gpt-4o-mini' }) preferredModel?: string;
  @CreateDateColumn() createdAt: Date;
}
```

**API Key Encryption:**
- Use AES-256-CBC encryption in `models/encryption.util.ts`
- Decrypt with `modelsService.getDecryptedApiKey(modelConfig)`

**External Services (Mem0.ai):**
- Use `MemuService` for memory storage/retrieval
- Gracefully disabled if `MEMU_ENABLED=false`
- Use `setImmediate()` for async memory operations (non-blocking)

### Frontend/Vue

**Composition API:**
```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const messages = ref([])

onMounted(async () => {
  // Fetch data
})
</script>
```

**Composables:** In `src/composables/`, named with `use` prefix: `useChatHistory.js`, `useToast.js`
```javascript
import { useChatHistory } from '../composables/useChatHistory'
const { messages, sessionKey, addMessage } = useChatHistory(characterId)
```

**API Calls:** Centralized in `src/services/api.js`
```javascript
import { fetchCharacter, streamChat } from '../services/api'

// SSE streaming (async generator)
for await (const chunk of streamChat(characterId, message, history)) {
  response += chunk
}
```

**LocalStorage Patterns:**
- Session history: `chat_session_${sessionKey}`
- Persistent user ID: `app_persistent_user_id` (for cross-session memory)
- Always `JSON.stringify()` / `JSON.parse()`

**Template:**
- Use `type="button"` on buttons
- Prefer `:class` bindings
- Handlers: `@click`, `@submit`, `@scroll`, `@keydown`
- Composition handlers: `@compositionstart`, `@compositionend` (for IME input)

## Key Patterns

**SSE (Server-Sent Events):**
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`
- Backend format: `data: ${JSON.stringify({ content: chunk })}\n\n`
- End signal: `data: ${JSON.stringify({ done: true })}\n\n`
- Frontend parsing: `line.startsWith('data: ')`, buffer splitting

**Async Iterators for Streaming:**
```typescript
async *streamChat(): AsyncGenerator<string> {
  for await (const chunk of this.openai.chat.completions.create(...)) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
```

**Vue Router:**
```javascript
const route = useRoute()
const router = useRouter()
const characterId = parseInt(route.params.characterId)
router.push({ name: 'home' })
router.replace({ path: route.path, query: { sessionKey: newSessionKey } })
```

**Error Response Format:**
```typescript
{
  success: false,
  error: {
    code: 'CHARACTER_NOT_FOUND',
    message: '角色不存在',
    timestamp: '2025-01-29T...',
    path: '/api/characters/999'
  }
}
```

## Environment Configuration

**Required .env variables:**
```
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=
DATABASE_URL=
NODE_ENV=development/production
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
PORT=3000
ENCRYPTION_KEY=              # 64-char hex for AES-256

# Mem0.ai (optional)
MEMU_API_KEY=
MEMU_BASE_URL=https://api.mem0.ai
MEMU_ENABLED=false
```

**Model Configuration Priority:**
1. Character's `preferredModel` (from database)
2. Database `models` table lookup
3. Fallback: Environment variables (`OPENAI_*`)

## Git Workflow

- Branches: `main`, `optimize/feature-enhancements`
- Commit format: `type(scope): description` (Conventional Commits)
  - `feat(chat): add streaming support`
  - `fix(auth): resolve token expiration issue`
- Run `npm run lint` before committing
- Don't commit: `node_modules/`, `dist/`, `*.log`, `.env`, `database.sqlite`
