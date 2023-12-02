import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as redis from 'redis';
import { CustomError } from "./common";


@Injectable()
export class RedisService{

    private client: redis.RedisClientType;
    private channelName: string;

    constructor(private configService: ConfigService){
        this.client = redis.createClient(
            {  url: this.configService.get<string>('REDIS_HOST') }
        );
        this.client.connect();
        this.channelName = this.configService.get<string>('SUBSCRIBE_CHANNEL');
        this.client.on('error', (err) => {throw new CustomError('RedisConnectionError', 500)});
    }

    async publish(memberId: string): Promise<void> {
        await this.client.publish(this.channelName, memberId);
    }
}
