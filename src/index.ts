import { buildServer } from "./app.js";
import PORT from "./config/normalizePort.js";

const startServer = async () => {
    try {
        const app = await buildServer();
        await app.listen({ port: Number(PORT), host: '0.0.0.0'});
        app.log.info(`Server is running on port ${PORT}`);
    }catch (error) {
        if (error instanceof Error && 'log' in error) {
            (error as any).log.error(error);
        } else {
            console.error(error);
        }
        process.exit(1);
    }
};
startServer();
