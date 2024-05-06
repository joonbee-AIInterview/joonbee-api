import { IsNotEmpty } from "class-validator";


export class OAuthParam{

    @IsNotEmpty()
    code: string;
}

export class RequestNickNameUpdateDTO{
    @IsNotEmpty()
    id: string;

    @IsNotEmpty()
    nickName: string
}