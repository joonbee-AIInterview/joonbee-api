import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Member } from "./member.entity";
import { Question } from "./question.entity";

@Entity({name: 'cart'})
export class Cart{

    @PrimaryColumn({ name: 'member_id' })
    memberId: string;

    @PrimaryColumn({ name: 'question_id' })
    questionId: number;

    @Column({ name: 'category_name'})
    categoryName: string;

    @ManyToOne(() => Member, member => member.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name : 'member_id' })
    member: Member;

    @ManyToOne(() => Question, (question) => question.id, { onDelete: 'CASCADE'})
    @JoinColumn({ name: 'question_id'})
    question: Question;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP'  })
    updatedAt: Date;

}