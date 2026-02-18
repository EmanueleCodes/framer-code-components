import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [
            react({
                babel: {
                    plugins: [["babel-plugin-react-compiler"]]
                }
            })
        ],
        base: "/demo/3d-globe",
        server: {
            allowedHosts: env.ALLOWED_HOSTS?.split(",") ?? ["localhost"]
        }
    };
});
