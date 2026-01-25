# AGENTS.md - AI Agent Guidelines

Essential information for AI agents working on this repository.

## Project Structure

Full-stack AI role-playing chat platform:
- **Backend**: NestJS (TypeScript), SQLite (TypeORM), OpenAI API
- **Frontend**: Vue 3 (Composition API), Vite, Markdown rendering

## Commands

### Backend (in `backend/` directory)

```bash
npm run start:dev              # Start with hot-reload
npm run start:debug            # Start with debug mode
npm run build                  # Compile TypeScript to dist/
npm run start:prod            # Run production build
npm run lint                  # Run ESLint with auto-fix
npm run format                # Run Prettier formatter
npm run test                  # Run all tests
npm run test:watch            # Run tests in watch mode
npm run test:cov              # Run with coverage report
npm run test:debug            # Debug tests with inspector
npm run test:e2e              # Run end-to-end tests

# Single test
npm run test -- chat.service.spec.ts
npm run test -- --testPathPattern=chat
```

### Frontend (in `frontend/` directory)

```bash
npm run dev                   # Start Vite dev server (http://localhost:5173)
npm run build                 # Build for production
npm run preview              # Preview production build
```

### Starting entire application

```bash
./start.sh                    # Starts both backend and frontend
```

## Code Style Guidelines

### TypeScript/Backend

**Imports:** Core NestJS → External libraries → Internal → Type imports
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { ChatRequestDto } from './dto/chat-request.dto';
import type { Response } from 'express';
```

**Formatting:** `.prettierrc`: single quotes `true`, trailing comma `all`

**Naming:**
- Classes/Interfaces: `PascalCase` (e.g., `ChatService`)
- Methods/Functions: `camelCase` (e.g., `streamChat()`)
- Variables/Properties: `camelCase` (e.g., `sessionKey`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_HISTORY_TURNS`)
- Private members: `camelCase` (no underscore prefix)
- Files: `kebab-case` (e.g., `chat.controller.ts`)

**DTOs & Validation:**
```typescript
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ChatRequestDto {
  @IsNumber()
  characterId: number;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
```

**Error Handling:**
- Use NestJS `Logger` instead of `console.log`
- Global exception filter: `GlobalExceptionFilter`
- ValidationPipe globally enabled with `whitelist: true`
- Log levels: `log()`, `warn()`, `error()`

**TypeORM Entities:**
```typescript
@Entity('characters')
export class Character {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  systemPrompt: string;

  @Column({ nullable: true, default: 'gpt-4o-mini' })
  preferredModel?: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Frontend/Vue

**Composition API:**
```javascript
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  setup() {
    const messages = ref([])
    const router = useRouter()

    async function fetchData() { /* ... */ }
    onMounted(fetchData)

    return { messages, fetchData }
  }
}
```

**Composables:** In `src/composables/`, named with `use` prefix: `useChatHistory.js`

**Template:** Use `type="button"` on buttons, prefer `:class` bindings, event handlers: `@click`, `@submit`, `@scroll`

### API Design

**SSE (Server-Sent Events):**
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`
- Format: `data: ${JSON.stringify({ content: chunk })}\n\n`
- Signal end: `data: ${JSON.stringify({ done: true })}\n\n`

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
```

## Key Patterns

**Async Iterators for Streaming:**
```typescript
async *streamChat(): AsyncGenerator<string> {
  for await (const chunk of this.openai.chat.completions.create(...)) {
    yield chunk;
  }
}
```

**Vue Router:**
```javascript
const route = useRoute()
const router = useRouter()
const characterId = parseInt(route.params.characterId)
router.push({ name: 'home' })
```

**LocalStorage:** Use `chat_session_${sessionKey}` format, JSON.stringify/parse

## Testing Notes

- Test files: `*.spec.ts` in same directory as source
- Coverage reports: `coverage/` directory
- E2E tests: `test/jest-e2e.json`

## Git Workflow

- Branches: `main`, `optimize/feature-enhancements`
- Commit format: `type(scope): description` (Conventional Commits)
- Run `npm run lint` before committing
- Don't commit `node_modules/`, `dist/`, `*.log`, `.env`
