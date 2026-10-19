// Seeds clearly marked demo campaigns so a fresh catalog is not empty.
// Demo campaigns never accept applications and are excluded from public stats.
// Their text is the Russian source; the web app translates it (src/lib/locales/demo.ts).
import { pool } from "@workspace/db";

const DEMO_OWNER = "demo";

const campaigns = [
  {
    title: "Ferrite: миграции Postgres из терминала",
    company: "Ferrite Labs",
    category: "DevTools",
    tags: ["cli", "postgres", "rust"],
    reward: "12 месяцев Ferrite Pro",
    rewardValue: 48,
    method: "secret_code",
    slots: 15,
    filledSlots: 6,
    minTrust: 50,
    description: "CLI для миграций схемы с откатом в одну команду. Нам нужны люди, которые прогонят его на своей базе и расскажут, где он ведёт себя неожиданно.",
    instructions: "1. Установите CLI и подключите тестовую базу.\n2. Создайте две миграции и откатите вторую.\n3. Запустите долгую миграцию и прервите её.\n4. Код для отчёта выводится после первого успешного отката.",
    questions: ["С какой версией Postgres вы работаете?", "Какими инструментами миграций пользовались раньше?"],
    featured: true,
  },
  {
    title: "Tessel: векторный поиск для небольших команд",
    company: "Tessel",
    category: "AI / ML",
    tags: ["python", "embeddings", "sdk"],
    reward: "150 API-кредитов",
    rewardValue: 30,
    method: "webhook",
    slots: 40,
    filledSlots: 31,
    minTrust: 60,
    description: "Управляемый векторный индекс с Python SDK. Проверяем первую загрузку данных и качество поиска на ваших документах.",
    instructions: "1. Зарегистрируйтесь по ссылке из BETADROP.\n2. Загрузите от 1 000 документов через SDK.\n3. Сделайте 20 запросов и отметьте нерелевантные ответы.\n4. Выполнение подтвердит наш сервер, после этого отправьте отчёт.",
    questions: ["Какие векторные базы вы уже пробовали?"],
    featured: false,
  },
  {
    title: "Ledgerline: кошелёк для тестовой сети",
    company: "Ledgerline",
    category: "Web3",
    tags: ["wallet", "evm", "browser"],
    reward: "Ранний доступ и 3 месяца Pro",
    rewardValue: 0,
    method: "email_match",
    slots: 25,
    filledSlots: 9,
    minTrust: 50,
    description: "Браузерный кошелёк с понятными подписями транзакций. Хотим услышать, где интерфейс сбивает с толку.",
    instructions: "1. Установите расширение и создайте кошелёк.\n2. Получите тестовые токены из крана.\n3. Отправьте перевод и подпишите сообщение.\n4. В отчёте укажите email, на который зарегистрировались.",
    questions: ["Каким кошельком вы пользуетесь сейчас?", "Какой браузер и ОС?"],
    featured: false,
  },
  {
    title: "Penny: учёт подписок для фрилансеров",
    company: "Penny Finance",
    category: "FinTech",
    tags: ["web", "banking", "onboarding"],
    reward: "6 месяцев Penny Plus",
    rewardValue: 36,
    method: "media",
    slots: 20,
    filledSlots: 20,
    minTrust: 40,
    description: "Находит регулярные списания в выписке и напоминает о продлении. Проверяем онбординг и импорт CSV из разных банков.",
    instructions: "1. Пройдите регистрацию.\n2. Импортируйте выписку в CSV (подойдут и тестовые данные).\n3. Запишите экран, если что-то сломается.\n4. Приложите ссылку на запись к отчёту.",
    questions: ["Из какого банка у вас выписка?"],
    featured: false,
  },
  {
    title: "Orbit: планировщик задач для Android",
    company: "Orbit",
    category: "Mobile",
    tags: ["android", "kotlin", "ux"],
    reward: "1 год Orbit Premium",
    rewardValue: 60,
    method: "secret_code",
    slots: 30,
    filledSlots: 12,
    minTrust: 80,
    description: "Планировщик, который сам раскладывает задачи по дню. Интересует первый запуск и работа без сети.",
    instructions: "1. Установите сборку из Google Play (закрытый тест).\n2. Добавьте пять задач и включите авиарежим.\n3. Отредактируйте задачи офлайн и вернитесь в сеть.\n4. Код для отчёта появится в настройках после синхронизации.",
    questions: ["Модель телефона и версия Android?"],
    featured: false,
  },
  {
    title: "Quay: превью-окружения для pull request",
    company: "Quay",
    category: "DevTools",
    tags: ["github", "docker", "ci"],
    reward: "3 месяца Quay Team",
    rewardValue: 45,
    method: "media",
    slots: 10,
    filledSlots: 2,
    minTrust: 50,
    description: "Поднимает отдельное окружение на каждый pull request. Проверяем установку GitHub App и первую сборку.",
    instructions: "1. Установите GitHub App на тестовый репозиторий.\n2. Откройте pull request с Dockerfile.\n3. Дождитесь ссылки на превью в комментарии.\n4. Запишите экран с момента установки до открытия превью.",
    questions: ["Какой CI у вас сейчас?", "Сколько сервисов в типичном репозитории?"],
    featured: false,
  },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Replace only untouched demo rows; demo campaigns never have applications.
    await client.query("DELETE FROM bd_campaigns WHERE demo AND owner_id=$1 AND id NOT IN (SELECT campaign_id FROM bd_applications)", [DEMO_OWNER]);
    for (const c of campaigns) {
      await client.query(
        `INSERT INTO bd_campaigns(owner_id,title,company,description,category,tags,reward,reward_value,method,slots,filled_slots,status,instructions,product_url,screening_questions,min_trust,featured,demo)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12,'https://example.com',$13,$14,$15,true)`,
        [DEMO_OWNER, c.title, c.company, c.description, c.category, c.tags, c.reward, c.rewardValue, c.method, c.slots, c.filledSlots, c.instructions, c.questions, c.minTrust, c.featured],
      );
    }
    await client.query("COMMIT");
    console.log(`Seeded ${campaigns.length} demo campaigns.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
