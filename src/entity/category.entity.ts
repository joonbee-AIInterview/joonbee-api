import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm/index';
import { Question } from './question.entity';

@Entity('category')
export class Category { // 1 Category : N Question

     @PrimaryGeneratedColumn()
     id: number;

     @Column({ type: 'varchar', length: 255, name: 'category_name' })
     categoryName: string;

     @Column({ type: 'tinyint', name: 'category_level' })
     categoryLevel: number; // 0 1

     @Column({ type: 'int', name: 'category_upper_id' })
     categoryUpperId: number;

     @OneToMany(() => Question, question => question.category)
     questions: Question[];

     @CreateDateColumn({ name: 'created_at' })
     createdAt: Date;

     @UpdateDateColumn({ name: 'updated_at' })
     updatedAt: Date;
}