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
npm run lint                   # Run ESLint with auto-fix
npm run test                   # Run all tests
npm run test:watch             # Watch mode
npm run test:cov               # Coverage report

# Single test
npm run test -- chat.service.spec.ts
npm run test -- --testPathPattern=chat
```

### Frontend (in `frontend/` directory)

```bash
npm run dev                    # Start Vite dev server (http://localhost:5173)
npm run build                  # Build for production
```

### Starting entire application

```bash
./start.sh                     # Starts both backend and frontend
```

## Code Style Guidelines

### TypeScript/Backend

**Imports:** Core NestJS → External libraries → Internal → Type imports
**Formatting:** `.prettierrc`: single quotes `true`, trailing comma `all`

**Naming:** Classes/Interfaces `PascalCase`, Methods/Variables `camelCase`, Constants `UPPER_SNAKE_CASE`, Private members `camelCase` (no underscore prefix), Files `kebab-case`

**DTOs & Validation:**
```typescript
export class ChatRequestDto {
  @IsNumber() characterId: number;
  @IsString() message: string;
  @IsOptional() @IsString() imageUrl?: string;
}
```

**Error Handling:**
- Use NestJS `Logger` (not `console.log`)
- Global exception filter: `GlobalExceptionFilter`
- ValidationPipe with `whitelist: true`

**TypeORM Entities:**
```typescript
@Entity('characters')
export class Character {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'text' }) systemPrompt: string;
  @Column({ nullable: true, default: 'gpt-4o-mini' }) preferredModel?: string;
  @CreateDateColumn() createdAt: Date;
}
```

**External Services (Mem0.ai):**
- Use `MemuService` for memory storage/retrieval
- Gracefully disabled if not configured
- Use `setImmediate()` for async memory operations (non-blocking)

### Frontend/Vue

**Composition API:**
```javascript
import { ref, onMounted } from 'vue'
export default {
  setup() {
    const messages = ref([])
    onMounted(() => { /* fetch data */ })
    return { messages }
  }
}
```

**Composables:** In `src/composables/`, named with `use` prefix: `useChatHistory.js`

**Template:** Use `type="button"` on buttons, prefer `:class` bindings, handlers: `@click`, `@submit`, `@scroll`

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

# Optional: Mem0.ai memory service
MEMU_API_KEY=
MEMU_BASE_URL=https://api.mem0.ai
MEMU_ENABLED=false
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

**LocalStorage:**
- Session history: `chat_session_${sessionKey}`
- Persistent user ID: `app_persistent_user_id`
- Use JSON.stringify/parse

## Testing Notes

- Test files: `*.spec.ts` in same directory as source
- Coverage reports: `coverage/` directory
- E2E tests: `test/jest-e2e.json`

## Git Workflow

- Branches: `main`, `optimize/feature-enhancements`
- Commit format: `type(scope): description` (Conventional Commits)
- Run `npm run lint` before committing
- Don't commit: `node_modules/`, `dist/`, `*.log`, `.env`
