import { BoundMethod } from "decorate";
import { Provide } from "microdi";

@Provide()
export class BotTalks {
  @BoundMethod
  public welcome() {
    return "Добро пожаловать 👋, пришлите ссылку с 🎥 для преобразования в аудиофайл";
  }

  @BoundMethod
  public incorrectMessageType() {
    return "Извните, не понимаю, пришлите ссылку на видео с Youtube или Vkontakte 🎥 для преобразования в аудиофайл";
  }

  @BoundMethod
  public linksNotFound() {
    return "Не могу найти в этом 👆 сообщении ссылок на видео с Youtube или Vkontakte. Пришлите хотя бы одну 🧐";
  }

  @BoundMethod
  public downloadStarted(url: string) {
    return `Скачиваем ${url}, пожалуйста подождите ⏳...`;
  }

  @BoundMethod
  public downloadFailed(url: string) {
    return `Произошла ошибка скачивания файла по ссылке ${url}, попробуйте другой файл`;
  }

  @BoundMethod
  public failedToUpload(url: string) {
    return `Файл по ссылке ${url} не удалось закачать`;
  }

  @BoundMethod
  public replyWithUploadedFileLink(url: string) {
    return `Файл слишком большой, поэтому мы загрузили его на файлообменник. Скачивать тут: ${url} 🧐`;
  }

  @BoundMethod
  public uploadingBigFile(url: string): string {
    return `Файл по ссылке ${url} слишком большой, загружаем на файлообменник`;
  }

  @BoundMethod
  public uploadingNormalFile(url: string): string {
    return `Файл по ссылке ${url} скачан и конвертирован в аудио, выгружаем`;
  }
}
