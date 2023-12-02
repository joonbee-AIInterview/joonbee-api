import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm/index';
import { Category } from './category.entity';
import { InterviewAndQuestion } from './and.question.entity';

@Entity('question')
export class Question {

     @PrimaryGeneratedColumn()
     id: number;

     @ManyToOne(() => Category, category => category.id, { onDelete: 'CASCADE' })
     @JoinColumn({ name: 'category_id' })
     category: Category;

     @OneToMany(() => InterviewAndQuestion, (imq) => imq.question )
     interviewAndQuestions: InterviewAndQuestion[];

     @Column({ type: 'tinyint', name: 'gpt_flag' })
     gptFlag: number; // 0 1

     @Column({ type: 'int', name: 'question_level' })
     questionLevel: number;

     @Column({ type: 'varchar', length: 255, nullable: false } )
     writer: string;

     @Column({ type: 'text', name: 'question_content'})
     questionContent: string;

     @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
     createdAt: Date;

     @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP'  })
     updatedAt: Date;
}