import { InterviewAndQuestion } from './and.question.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Member } from "./member.entity";

@Entity('interview')
export class Interview{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'member_id', type: 'varchar', length: 255 })
    memberId: string;

    @Column({ name : 'category_name' })
    categoryName: string;

    @ManyToOne(() => Member, member => member.id, { onDelete: 'CASCADE'})
    @JoinColumn({name: 'member_id'})
    member: Member;
  
    @OneToMany(() => InterviewAndQuestion, (iaq) => iaq.interview)
    interviewAndQuestions: InterviewAndQuestion[];

    @CreateDateColumn({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP'  })
    updatedAt: Date;
}