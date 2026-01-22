"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const characters_service_1 = require("../characters/characters.service");
let ChatService = class ChatService {
    configService;
    charactersService;
    openai;
    constructor(configService, charactersService) {
        this.configService = configService;
        this.charactersService = charactersService;
        this.openai = new openai_1.default({
            apiKey: this.configService.get('OPENAI_API_KEY') || 'your-api-key',
            baseURL: this.configService.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
        });
    }
    async *streamChat(chatRequest) {
        const character = await this.charactersService.findOne(chatRequest.characterId);
        const messages = [
            {
                role: 'system',
                content: character.systemPrompt,
            },
        ];
        if (chatRequest.history && chatRequest.history.length > 0) {
            for (const msg of chatRequest.history) {
                messages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
        }
        if (chatRequest.imageUrl) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: chatRequest.message },
                    { type: 'image_url', image_url: { url: chatRequest.imageUrl } },
                ],
            });
        }
        else {
            messages.push({
                role: 'user',
                content: chatRequest.message,
            });
        }
        const stream = await this.openai.chat.completions.create({
            model: this.configService.get('OPENAI_MODEL') || 'gpt-4o-mini',
            messages,
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        characters_service_1.CharactersService])
], ChatService);
//# sourceMappingURL=chat.service.js.map