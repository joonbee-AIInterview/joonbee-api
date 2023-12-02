# 사용할 Node.js 버전을 선택합니다.
FROM node:18

# 작업 디렉토리를 설정합니다.
WORKDIR /app

# 앱 종속성을 설치합니다. package.json과 package-lock.json을 복사하고 먼저 종속성 설치를 실행합니다.
COPY package*.json ./
RUN npm install

# 소스 코드를 컨테이너에 복사합니다.
COPY . .

# 애플리케이션을 빌드합니다.
RUN npm run build

# PM2를 전역으로 설치합니다.
RUN npm install pm2 -g

# PM2로 애플리케이션을 실행합니다.
CMD ["pm2-runtime", "start", "dist/main.js"]
