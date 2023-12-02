import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Interview } from "./interview.entity";
import { Question } from "./question.entity";


@Entity('interview_and_question')
export class InterviewAndQuestion{

    @PrimaryColumn({ name: 'interview_id'})
    interviewId: number;

    @PrimaryColumn({ name: 'question_id'})
    questionId: number;

    @Column({ name: 'answer_content', type: 'text'})
    answerContent: string;
    
    @ManyToOne(() => Interview, interview => interview.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name : 'interview_id' })
    interview: Interview;

    @ManyToOne(() => Question, question => question.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name : 'question_id' })
    question: Question;

}