const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY не найден в .env");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Проверка сервера
app.get("/api/status", (req, res) => {
    res.json({
        ok: true,
        service: "Future Vision V3",
        ai: "OpenAI"
    });
});

// Генерация изображения
app.post("/api/generate", async (req, res) => {

    try {

        const {
            prompt,
            size = "1024x1024",
            quality = "auto"
        } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({
                ok: false,
                error: "Промпт не указан."
            });
        }

        if (prompt.length > 10000) {
            return res.status(400).json({
                ok: false,
                error: "Промпт слишком длинный."
            });
        }

        console.log("🔮 Начинаем генерацию...");

        const started = Date.now();

        const result = await openai.images.generate({
            model: "gpt-image-2",
            prompt: prompt,
            size: size,
            quality: quality,
            n: 1
        });

        const elapsed =
            ((Date.now() - started) / 1000).toFixed(2);

        console.log(
            `✅ Изображение готово за ${elapsed} сек.`
        );

        const image = result.data?.[0];

        if (!image) {
            throw new Error(
                "OpenAI не вернул изображение."
            );
        }

        // GPT-Image обычно возвращает base64
        if (image.b64_json) {

            return res.json({
                ok: true,
                image:
                    "data:image/png;base64," +
                    image.b64_json,
                time: Number(elapsed)
            });
        }

        // Запасной вариант, если API вернул URL
        if (image.url) {

            return res.json({
                ok: true,
                image: image.url,
                time: Number(elapsed)
            });
        }

        throw new Error(
            "Неизвестный формат ответа OpenAI."
        );

    } catch (error) {

        console.error("❌ OpenAI error:");
        console.error(error);

        let status = 500;

        if (error.status) {
            status = error.status;
        }

        let message =
            error?.error?.message ||
            error?.message ||
            "Неизвестная ошибка OpenAI.";

        if (status === 401) {
            message =
                "API-ключ недействителен или неправильный.";
        }

        if (status === 403) {
            message =
                "Доступ к API запрещён для этого аккаунта.";
        }

        if (status === 429) {
            message =
                "Лимит API исчерпан или слишком много запросов.";
        }

        res.status(status).json({
            ok: false,
            error: message,
            status: status
        });
    }
});

// 404
app.use((req, res) => {

    res.status(404).json({
        ok: false,
        error: "Маршрут не найден."
    });

});

// Запуск
app.listen(PORT, () => {

    console.log("");
    console.log("=================================");
    console.log("🔮 FUTURE VISION V3");
    console.log("=================================");
    console.log(`🚀 Сервер: http://localhost:${PORT}`);
    console.log("🤖 AI: OpenAI GPT-Image-2");
    console.log("🔑 API key: загружен из .env");
    console.log("=================================");
    console.log("");

});
