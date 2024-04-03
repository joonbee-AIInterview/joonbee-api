import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Member } from "./member.entity";
import { Question } from "./question.entity";
import { Interview } from "./interview.entity";


@Entity('like')
export class Like{
    @PrimaryColumn({ name: 'member_id'})
    memberId: string;

    @PrimaryColumn({ name: 'interview_id'})
    interviewId: number;

    @ManyToOne(() => Member, member => member.id, { onDelete: 'CASCADE'})
    @JoinColumn({ name: 'member_id'})
    member: Member;

    @ManyToOne(() => Interview, interview => interview.id, { onDelete: 'CASCADE'})
    @JoinColumn({ name: 'interview_id' })
    interview: Interview;

}