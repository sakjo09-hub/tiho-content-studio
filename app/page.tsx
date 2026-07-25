"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Format = "post" | "stories" | "reel";
type Tone = "warm" | "expert" | "sales";
type Goal = "trust" | "booking" | "education";

const formats: { id: Format; icon: string; title: string; hint: string }[] = [
  { id: "post", icon: "✦", title: "Пост", hint: "Текст + призыв" },
  { id: "stories", icon: "◫", title: "Сторис", hint: "Серия из 4 экранов" },
  { id: "reel", icon: "▶", title: "Рилс", hint: "Сценарий на 20 сек." },
];

const quickIdeas = [
  "Почему после массажа хочется пить?",
  "Результат процедуры: лёгкость в спине",
  "3 привычки для расслабленной шеи",
  "Знакомство со мной и моим кабинетом",
];

const safeTopic = (value: string) =>
  value.trim().replace(/\s+/g, " ").slice(0, 240);

function buildContent(format: Format, tone: Tone, goal: Goal, idea: string) {
  const topic = safeTopic(idea) || "мягкое восстановление и забота о теле";
  const hooks = {
    warm: `Иногда телу нужно не «потерпеть ещё», а немного заботы.`,
    expert: `Разберём без мифов: ${topic.toLowerCase()}.`,
    sales: `Подарите себе час, после которого легче дышать и двигаться.`,
  };
  const goalLine = {
    trust: "На сеансе я всегда уточняю самочувствие и подбираю интенсивность индивидуально.",
    booking: "На этой неделе есть несколько свободных окон — напишите мне «ХОЧУ», и я подберу удобное время.",
    education: "Важно: ощущения и потребности у всех разные. Ориентируйтесь на самочувствие, а при жалобах консультируйтесь с врачом.",
  };

  if (format === "post") {
    return {
      title: "Готовый пост",
      eyebrow: "Можно публиковать",
      body: `${hooks[tone]}\n\nСегодня говорим про ${topic.toLowerCase()}.\n\nМассаж — это время, когда можно замедлиться, прислушаться к ощущениям и отпустить накопившееся напряжение. Без обещаний «волшебного лечения» — только бережная работа, комфорт и внимание к вашему состоянию.\n\n${goalLine[goal]}\n\nСохраните пост, чтобы вернуться к нему позже 🤍`,
      tags: "#массаж #заботаосебе #здороваяспина #отдых #массажист",
    };
  }
  if (format === "stories") {
    return {
      title: "4 экрана сторис",
      eyebrow: "Коротко и живо",
      body: `1 — ЗАЦЕПКА\n${hooks[tone]}\n\n2 — ТЕМА\n${topic}\nПокажите фото кабинета, процесса или спокойный лайф-кадр.\n\n3 — ПОЛЬЗА\nМягкая работа с телом помогает расслабиться и лучше замечать собственные ощущения. Результат всегда индивидуален.\n\n4 — ДЕЙСТВИЕ\n${goalLine[goal]}`,
      tags: "Стикер: «Записаться» · Реакция: 🤍",
    };
  }
  return {
    title: "Сценарий рилс",
    eyebrow: "≈ 20 секунд",
    body: `0–3 сек. — Крупный план / деталь кабинета\nТекст на экране: «${hooks[tone]}»\n\n3–10 сек. — 2–3 спокойные смены кадра\nЗакадрово: «Сегодня коротко про ${topic.toLowerCase()}. В работе я ориентируюсь на ваши ощущения и не использую универсальные обещания».\n\n10–16 сек. — Лайф-кадр или подготовка кабинета\nТекст: «Бережно. Индивидуально. В вашем темпе».\n\n16–20 сек. — Вы в кадре\nЗакадрово: «${goalLine[goal]}»`,
    tags: "Музыка: спокойная, без резких переходов · 3–4 кадра",
  };
}

export default function Home() {
  const [format, setFormat] = useState<Format>("post");
  const [tone, setTone] = useState<Tone>("warm");
  const [goal, setGoal] = useState<Goal>("booking");
  const [idea, setIdea] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [result, setResult] = useState<ReturnType<typeof buildContent> | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const selectedFormat = useMemo(
    () => formats.find((item) => item.id === format)!,
    [format],
  );

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash("Нужен файл изображения");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      flash("Фото должно быть меньше 10 МБ");
      event.target.value = "";
      return;
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoName(file.name.slice(0, 80));
  };

  const generate = () => {
    setBusy(true);
    window.setTimeout(() => {
      setResult(buildContent(format, tone, goal, idea));
      setBusy(false);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }, 520);
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`${result.body}\n\n${result.tags}`);
      flash("Текст скопирован");
    } catch {
      flash("Выделите текст и скопируйте вручную");
    }
  };

  const downloadCard = () => {
    if (!result) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = (image?: HTMLImageElement) => {
      const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
      gradient.addColorStop(0, "#1f392f");
      gradient.addColorStop(1, "#8b6956");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1920);
      if (image) {
        const scale = Math.max(1080 / image.width, 1920 / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        ctx.globalAlpha = 0.46;
        ctx.drawImage(image, (1080 - w) / 2, (1920 - h) / 2, w, h);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "rgba(19, 31, 27, .58)";
      ctx.fillRect(0, 0, 1080, 1920);
      ctx.fillStyle = "#f6f0e8";
      ctx.font = "700 44px Arial";
      ctx.fillText("ТИХО • КОНТЕНТ-СТУДИЯ", 72, 120);
      ctx.font = "700 78px Georgia";
      const words = (safeTopic(idea) || "Забота о теле начинается с внимания к себе").split(" ");
      const lines: string[] = [];
      let line = "";
      words.forEach((word) => {
        const test = `${line}${word} `;
        if (ctx.measureText(test).width > 900 && line) {
          lines.push(line.trim());
          line = `${word} `;
        } else line = test;
      });
      lines.push(line.trim());
      lines.slice(0, 5).forEach((text, index) => ctx.fillText(text, 72, 1180 + index * 92));
      ctx.font = "400 38px Arial";
      ctx.fillStyle = "#e7d8c9";
      ctx.fillText("Бережно. Индивидуально. В вашем темпе.", 72, 1750);
      const link = document.createElement("a");
      link.download = "story-tiho.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      flash("Карточка скачана");
    };
    if (photoUrl) {
      const image = new Image();
      image.onload = () => draw(image);
      image.onerror = () => draw();
      image.src = photoUrl;
    } else draw();
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Тихо — на главную">
          <span className="brand-dot" aria-hidden="true">т</span>
          <span>тихо</span>
        </a>
        <span className="privacy-pill"><span aria-hidden="true">●</span> Фото остаются у вас</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker">Контент-студия для массажиста</p>
          <h1>Пост готов.<br/><em>Можно выдохнуть.</em></h1>
          <p className="hero-text">Добавьте фото или мысль — получите готовый текст, сторис или сценарий рилс без маркетолога и долгих раздумий.</p>
          <div className="hero-proof">
            <span>≈ 1 минута</span><span>Без регистрации</span><span>Бережные формулировки</span>
          </div>
        </div>
        <div className="sample-card" aria-hidden="true">
          <div className="sample-photo">
            <span className="sample-label">НОВАЯ СТОРИС</span>
            <p>Забота о себе<br/>не должна ждать<br/>особого повода.</p>
            <span className="sample-action">Записаться →</span>
          </div>
          <div className="sample-note">Готово за минуту <span>✦</span></div>
        </div>
      </section>

      <section className="studio" aria-labelledby="studio-title">
        <div className="studio-heading">
          <div>
            <p className="kicker">Создать публикацию</p>
            <h2 id="studio-title">Что сделаем сегодня?</h2>
          </div>
          <span className="step-count">4 простых шага</span>
        </div>

        <div className="builder-grid">
          <div className="controls">
            <fieldset>
              <legend><span>1</span> Выберите формат</legend>
              <div className="format-grid">
                {formats.map((item) => (
                  <button key={item.id} type="button" className={`format-button ${format === item.id ? "active" : ""}`} onClick={() => setFormat(item.id)} aria-pressed={format === item.id}>
                    <span className="format-icon" aria-hidden="true">{item.icon}</span>
                    <strong>{item.title}</strong>
                    <small>{item.hint}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend><span>2</span> Добавьте материал <small>необязательно</small></legend>
              <div className="material-grid">
                <label className={`upload ${photoUrl ? "has-photo" : ""}`}>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/heic" onChange={onPhoto} />
                  {photoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl} alt="Выбранное фото для публикации" />
                      <span className="photo-badge">Заменить фото</span>
                    </>
                  ) : (
                    <>
                      <span className="upload-icon" aria-hidden="true">＋</span>
                      <strong>Добавить фото</strong>
                      <small>JPG, PNG, WEBP · до 10 МБ</small>
                    </>
                  )}
                </label>
                <div className="idea-wrap">
                  <label htmlFor="idea">Или опишите идею</label>
                  <textarea id="idea" value={idea} maxLength={240} onChange={(event) => setIdea(event.target.value)} placeholder="Например: почему после массажа хочется пить?" />
                  <span className="char-count">{idea.length}/240</span>
                </div>
              </div>
              {photoName && <p className="file-note">Фото выбрано: {photoName}. Оно не загружается на сервер.</p>}
              <div className="quick-ideas" aria-label="Быстрые идеи">
                {quickIdeas.map((item) => <button type="button" key={item} onClick={() => setIdea(item)}>+ {item}</button>)}
              </div>
            </fieldset>

            <div className="options-row">
              <fieldset>
                <legend><span>3</span> Тон</legend>
                <div className="segmented">
                  {([["warm", "Тёплый"], ["expert", "Экспертный"], ["sales", "Продающий"]] as [Tone, string][]).map(([id, label]) =>
                    <button type="button" key={id} className={tone === id ? "active" : ""} onClick={() => setTone(id)}>{label}</button>
                  )}
                </div>
              </fieldset>
              <fieldset>
                <legend><span>4</span> Цель</legend>
                <select value={goal} onChange={(event) => setGoal(event.target.value as Goal)} aria-label="Цель публикации">
                  <option value="booking">Получить записи</option>
                  <option value="trust">Укрепить доверие</option>
                  <option value="education">Объяснить тему</option>
                </select>
              </fieldset>
            </div>

            <button className="generate-button" type="button" onClick={generate} disabled={busy}>
              <span>{busy ? "Собираю публикацию…" : `Создать ${selectedFormat.title.toLowerCase()}`}</span>
              <span aria-hidden="true">{busy ? "◌" : "→"}</span>
            </button>
            <p className="safety-note">Тексты не содержат диагнозов и обещаний лечения. Перед публикацией проверьте факты и личные данные на фото.</p>
          </div>

          <aside className="preview-shell" aria-label="Предпросмотр">
            <div className="phone">
              <div className="phone-top"><span>9:41</span><i></i><span>•••</span></div>
              <div className="social-head">
                <span className="avatar">М</span>
                <span><strong>Массаж у Марины</strong><small>ваш город</small></span>
                <b>•••</b>
              </div>
              <div className={`preview-media ${photoUrl ? "with-photo" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photoUrl && <img src={photoUrl} alt="" />}
                <div>
                  <small>{selectedFormat.title.toUpperCase()}</small>
                  <p>{safeTopic(idea) || "Время позаботиться о себе"}</p>
                </div>
              </div>
              <div className="social-actions"><span>♡　◇　⌁</span><span>▢</span></div>
              <p className="preview-caption"><strong>massage_marina</strong> {result ? result.body.split("\n")[0] : "Новый пост появится здесь после создания…"}</p>
            </div>
            <p className="preview-hint">Так публикация будет выглядеть в ленте</p>
          </aside>
        </div>
      </section>

      {result && (
        <section className="result-section" ref={resultRef} aria-live="polite">
          <div className="result-head">
            <div><p className="kicker">{result.eyebrow}</p><h2>{result.title}</h2></div>
            <span className="ready-badge">● Готово</span>
          </div>
          <div className="result-card">
            <pre>{result.body}</pre>
            <p className="tags">{result.tags}</p>
            <div className="result-actions">
              <button type="button" className="copy-button" onClick={copy}>Скопировать текст</button>
              <button type="button" className="download-button" onClick={downloadCard}>Скачать сторис-карточку</button>
              <button type="button" className="again-button" onClick={generate}>Другой вариант</button>
            </div>
          </div>
        </section>
      )}

      <section className="how">
        <p className="kicker">Спокойный контент-процесс</p>
        <h2>Не нужно становиться маркетологом,<br/>чтобы регулярно рассказывать о себе.</h2>
        <div className="how-grid">
          <article><span>01</span><h3>Собирайте живые моменты</h3><p>Фото кабинета, результата или обычного рабочего дня уже достаточно.</p></article>
          <article><span>02</span><h3>Добавляйте одну мысль</h3><p>Не нужен бриф. Напишите тему так, как рассказали бы клиенту.</p></article>
          <article><span>03</span><h3>Публикуйте своим голосом</h3><p>Получите основу, проверьте детали и добавьте пару личных слов.</p></article>
        </div>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-dot">т</span><span>тихо</span></a><p>Контент без суеты. Для мастеров, которые всё делают сами.</p><span>Фото обрабатываются только на вашем устройстве.</span></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
