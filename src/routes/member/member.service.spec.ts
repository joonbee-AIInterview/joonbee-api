import { DataSource, Repository, createQueryBuilder } from "typeorm";
import { MemberService } from "./member.service";
import { Member } from "src/entity/member.entity";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Interview } from "src/entity/interview.entity";
import { InterviewAndQuestion } from "src/entity/and.question.entity";
import { Category } from "src/entity/category.entity";
import { Cart } from "src/entity/cart.entity";
import { RedisService } from "src/common/config/redis.config";
import {  Provider, forwardRef } from "@nestjs/common";
import { Like } from "src/entity/like.entity";
import { mock } from "node:test";


describe('MemberService', () => {
    let service: MemberService;
    let memberRepository: MockType<Repository<Member>>;
    let interviewRepository: MockType<Repository<Interview>>;
    // 기타 필요한 리포지토리를 추가로 정의할 수 있습니다.
    const dataSourceMock = {
        name: 'mysql'
      };
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: getRepositoryToken(Member),
            useValue: {
              createQueryBuilder: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    m_id: '13b4a',
                    m_thumbnail: 'https://i.ytimg.com/vi/_LVtaiW6j3U/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBN2WG-3sj3NY31Fxp4z0EnzyEnjQ',
                    nick_name: '패스트캠퍼스',
                    email: 'test@example.com',
                    interviewCount: '9'
                  }),
              })),
            },
          },
          {
            provide: getRepositoryToken(Interview),
            useValue: {
              createQueryBuilder: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    { categoryName: 'be', questionCount: '9' },
                ]),
              })),
            },
          },
          // 기타 필요한 리포지토리의 모의 구현
          {
            provide: DataSource,
            useValue: {/* DataSource에 대한 모의 구현, 필요한 경우 */},
          },
        ],
      }).compile();
  
      service = module.get<MemberService>(MemberService);
      memberRepository = module.get(getRepositoryToken(Member));
      interviewRepository = module.get(getRepositoryToken(Interview));
      // 기타 리포지토리 초기화
    });
  
    it('should return expected member info for memberId', async () => {
      const memberId = 'someMemberId';
      const result = await service.myInfoData(memberId);
  
      expect(result).toEqual({
        id: '13b4a',
        thumbnail: 'https://i.ytimg.com/vi/_LVtaiW6j3U/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBN2WG-3sj3NY31Fxp4z0EnzyEnjQ',
        nickName: '패스트캠퍼스',
        email: 'test@example.com',
        interviewCount: 9,
        questionCount: 9, 
        categoryInfo: [
          { categoryName: 'be', categoryCount: 9},
         
        ]
      });
    });
  });


  // describe('MemberService - insertLike', () => {
  //   let service: MemberService;
  //   let likeRepository: MockType<Repository<Like>>;
  
  //   const likeMockRepsitory = {
  //     createQueryBuilder: jest.fn(() => ({
  //       where: jest.fn().mockReturnThis(),
  //       andWhere: jest.fn().mockReturnThis(),
  //       getOne: jest.fn().mockResolvedValue(new Like()),
  //       delete: jest.fn().mockReturnThis(),
  //       execute: jest.fn().mockReturnThis()
  //     }))
  //   }

  //   beforeEach(async () => {
      
  //     const module: TestingModule = await Test.createTestingModule({
  //       providers: [
  //           {
  //             provide: getRepositoryToken(Like),
  //             useValue: likeMockRepsitory
  //           },
  //           {
  //             provide: DataSource,
  //             useValue: {/* DataSource에 대한 모의 구현, 필요한 경우 */},
  //           },
  //       ]
  //     }).compile();

  //     service = module.get<MemberService>(MemberService);
  //     likeRepository = module.get(getRepositoryToken(Like));
  //   });
  
  //   it('should delete the like if it exists', async () => {

  //     await service.insertLike('13b4a', 44);
  
  //     expect(likeRepository.delete).toHaveBeenCalledTimes(1);
  //   });
  
  // });
  
interface IMockRepositoryMap {
  [key: string]: any;
}






type MockType<T> = {
  [P in keyof T]?: jest.Mock<{}>;
};
/*
describe('memberService', () => {
    let service: MemberService;
    let memberRepositoryMock: Repository<Member>;
    const dataSourceMock = {
        name: 'mysql'
      };
      
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
              MemberService,
             
              {
                provide: DataSource,
                useValue: dataSourceMock,
              },,
              {
                provide: getRepositoryToken(Like),
                useValue: {}
              },
              {
                provide: getRepositoryToken(InterviewAndQuestion),
                useValue: {}
              },
              {
                provide: getRepositoryToken(Category),
                useValue: {}
              },
              {
                provide: getRepositoryToken(Cart),
                useValue: {}
              },
              {
                provide: getRepositoryToken(Member),
                useValue: {
                  createQueryBuilder: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({
                        m_id: '13b4a',
                        m_thumbnail: 'https://i.ytimg.com/vi/_LVtaiW6j3U/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBN2WG-3sj3NY31Fxp4z0EnzyEnjQ',
                        nick_name: '패스트캠퍼스',
                        email: 'test@example.com',
                        interviewCount: '9'
                      }),
                  })),
                },
              },
              {
                provide: getRepositoryToken(Interview),
                useValue: {
                  createQueryBuilder: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    innerJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    getRawMany: jest.fn().mockResolvedValue([
                        { categoryName: 'be', questionCount: '9' },
                    ]),
                  })),
                },
              },
            ],
          }).compile();

          service = module.get<MemberService>(MemberService);
    });

    it('should return expected member info for memberId "134ba"', async () => {
        const memberId = '13b4a';
        const result = await service.myInfoData(memberId);
    
        expect(result).toEqual({
          id: '13b4a',
          thumbnail: 'https://i.ytimg.com/vi/_LVtaiW6j3U/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBN2WG-3sj3NY31Fxp4z0EnzyEnjQ',
          nickName: '패스트캠퍼스',
          email: 'test@example.com',
          interviewCount: 9,
          questionCount: 9, 
          categoryInfo: [
            { categoryName: 'be', categoryCount: '9' },
           
          ]
        });
      });
});

*/