import { Bot, InputFile } from "grammy";
import { resolve } from "microdi";
import { PodcastifyBot } from "services/PodcastifyBot.ts";
import { Downloader } from "services/Downloader.ts";
import { LinksExtractor } from "services/LinksExtractor.ts";
import { PanicBus } from "services/PanicBus.ts";
import { load } from "dotenv";

await load({ export: true });

const LIMIT = 50 * 1024 * 1024;

const bot: Bot = resolve(PodcastifyBot);
const downloader = resolve(Downloader);
const linksExtractor = resolve(LinksExtractor);
const panicBus = resolve(PanicBus);

bot.command("start", (ctx) =>
  ctx.reply(
    "Добро пожаловать 👋, пришлите ссылку с Youtube 🎥 для преобразования в аудиофайл"
  )
);

bot.on("message", async (ctx): Promise<void> => {
  const { text } = ctx.message;
  if (!text) {
    await ctx.reply(
      "Извните, не понимаю, пришлите ссылку на видео с Youtube 🎥 для преобразования в аудиофайл",
      {
        reply_parameters: {
          message_id: ctx.message.message_id,
        },
      }
    );
    return;
  }

  const links = linksExtractor.getUrlsFromText(text);

  if (links.length === 0) {
    await ctx.reply(
      "Не могу найти в этом 👆 сообщении ссылок на видео с Youtube. Пришлите хотя бы одну 🧐",
      {
        reply_parameters: {
          message_id: ctx.message.message_id,
        },
      }
    );
    return;
  }

  for (const { type, message, url } of links) {
    if (type === "UNKNOWN") {
      await ctx.reply(message, {
        reply_parameters: {
          message_id: ctx.message.message_id,
        },
      });
      continue;
    }
    const waitMessage = await ctx.reply(
      `Скачиваем ${url.toString()}, пожалуйста подождите ⏳...`,
      {
        reply_parameters: {
          message_id: ctx.message.message_id,
        },
      }
    );
    const downloadResult = await downloader.submitDownloadTaskAndGetResult(
      url.toString()
    );

    try {
      if (downloadResult.filePath === null) {
        await ctx.reply(
          `Произошла ошибка скачивания файла по ссылке ${url.toString()}, попробуйте другой файл`,
          {
            reply_parameters: {
              message_id: ctx.message.message_id,
            },
          }
        );
        return;
      }
      const downloadedFileStats = await Deno.stat(downloadResult.filePath);
      if (downloadedFileStats.size <= LIMIT) {
        await ctx.replyWithAudio(new InputFile(downloadResult.filePath), {
          caption: url.toString(),
          reply_parameters: {
            message_id: ctx.message.message_id,
          },
        });
      } else {
        await ctx.reply(
          `Файл по ссылке ${url.toString()} слишком большой для скачивания.`,
          {
            reply_parameters: {
              message_id: ctx.message.message_id,
            },
          }
        );
      }
      await ctx.api.deleteMessage(ctx.chat.id, waitMessage.message_id);
    } finally {
      await downloadResult.deleteFile();
    }
  }
});

bot.start();
panicBus.subscribe(function subscriber({ message, serviceName }) {
  console.error(`[${serviceName}] ${message}`);
  Deno.exit(1);
});
