"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: (origin, callback) => {
            if (process.env.NODE_ENV !== 'production') {
                if (!origin || origin.match(/^http:\/\/localhost:\d+$/)) {
                    callback(null, true);
                    return;
                }
            }
            const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), {
        prefix: '/uploads/',
    });
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 Backend running at http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map