import { Session } from './session.entity';
export declare class Message {
    id: number;
    sessionId: number;
    session: Session;
    role: 'user' | 'assistant';
    content: string;
    imageUrl: string;
    createdAt: Date;
}
