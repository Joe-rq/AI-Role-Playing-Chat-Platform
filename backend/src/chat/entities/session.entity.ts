import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Character } from '../../characters/entities/character.entity';
import { Message } from './message.entity';

@Entity('sessions')
export class Session {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100, unique: true })
    sessionKey: string;

    @Column()
    characterId: number;

    @ManyToOne(() => Character)
    @JoinColumn({ name: 'characterId' })
    character: Character;

    @OneToMany(() => Message, message => message.session)
    messages: Message[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
