import { IsNotEmpty } from "class-validator";


export class OAuthParam{

    @IsNotEmpty()
    code: string;
}