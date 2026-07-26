"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Format = "post" | "stories" | "reel";
type Tone = "warm" | "expert" | "sales";
type Goal = "trust" | "booking" | "education";
type VisualStyle = "paper" | "stickers" | "overlay";
type StoryPlan = {
  headline: string;
  body: string;
  caption: string;
  layout: "editorial" | "stickers" | "infographic" | "before-after";
  palette: "sand" | "sage" | "charcoal" | "rose";
  photoRole: "background" | "hero" | "split" | "none";
};

const formats: { id: Format; icon: string; title: string; hint: string }[] = [
  { id: "post", icon: "✦", title: "Пост", hint: "Квадрат 1080 × 1080" },
  { id: "stories", icon: "◫", title: "Сторис", hint: "Вертикально 1080 × 1920" },
  { id: "reel", icon: "▶", title: "Рилс", hint: "Обложка 1080 × 1920" },
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
      title: "Готовая сторис",
      eyebrow: "Картинка уже собрана",
      body: `${hooks[tone]}\n\nТема: ${topic}\n\n${goalLine[goal]}`,
      tags: "Можно скачать картинку и сразу опубликовать в сторис",
    };
  }
  return {
    title: "Сценарий рилс",
    eyebrow: "≈ 20 секунд",
    body: `0–3 сек. — Крупный план / деталь кабинета\nТекст на экране: «${hooks[tone]}»\n\n3–10 сек. — 2–3 спокойные смены кадра\nЗакадрово: «Сегодня коротко про ${topic.toLowerCase()}. В работе я ориентируюсь на ваши ощущения и не использую универсальные обещания».\n\n10–16 сек. — Лайф-кадр или подготовка кабинета\nТекст: «Бережно. Индивидуально. В вашем темпе».\n\n16–20 сек. — Вы в кадре\nЗакадрово: «${goalLine[goal]}»`,
    tags: "Музыка: спокойная, без резких переходов · 3–4 кадра",
  };
}

function buildVisualCopy(tone: Tone, goal: Goal, idea: string) {
  const topic = safeTopic(idea);
  if (topic) {
    if (goal === "booking") return `${topic}\n\nЗапись открыта — напишите мне, чтобы выбрать удобное время.`;
    if (goal === "trust") return `${topic}\n\nБережно, индивидуально и с вниманием к вашим ощущениям.`;
    return `${topic}\n\nСохраняйте, чтобы не потерять.`;
  }
  if (tone === "sales") return "Подарите себе час,\nпосле которого легче\nдышать и двигаться.\n\nЗапись открыта ✦";
  if (tone === "expert") return "Массаж — не волшебство,\nа бережная работа\nс вашим телом\nи самочувствием.";
  return "Иногда телу нужно\nне «потерпеть ещё»,\nа немного заботы.\n\nВы это заслужили 🤍";
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = [];
  text.split("\n").forEach((paragraph) => {
    if (!paragraph) {
      lines.push("");
      return;
    }
    let line = "";
    paragraph.split(" ").forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
  });
  return lines.slice(0, 9);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

async function renderCreative(
  canvas: HTMLCanvasElement,
  format: Format,
  style: VisualStyle,
  photoUrl: string,
  copy: string,
  plan?: StoryPlan | null,
) {
  const width = 1080;
  const height = format === "post" ? 1080 : 1920;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const paintBackground = (image?: HTMLImageElement) => {
    const palettes = {
      sand: ["#ead7c1", "#b58a70", "#684c42"],
      sage: ["#d7dfd8", "#617d6d", "#304b3f"],
      charcoal: ["#282828", "#151515", "#000000"],
      rose: ["#ecd7d4", "#b9827b", "#744d51"],
    };
    const colors = palettes[plan?.palette || "sage"];
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(.52, colors[1]);
    gradient.addColorStop(1, colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    if (image) {
      const scale = Math.max(width / image.width, height / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    } else {
      ctx.fillStyle = "rgba(255,255,255,.11)";
      ctx.beginPath();
      ctx.arc(width * .78, height * .19, width * .3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width * .08, height * .77, width * .42, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "700 28px Arial";
    ctx.letterSpacing = "4px";
    const resolvedStyle: VisualStyle = plan?.layout === "stickers"
      ? "stickers"
      : plan?.layout === "infographic"
        ? "overlay"
        : style;
    ctx.fillStyle = resolvedStyle === "paper" || resolvedStyle === "stickers" ? "rgba(255,255,255,.92)" : "#fff";
    ctx.fillText("ТИХО • КОНТЕНТ-СТУДИЯ", 62, 72);
    ctx.letterSpacing = "0px";

    const baseFont = format === "post" ? 58 : 66;
    ctx.font = `500 ${baseFont}px Arial`;
    const maxTextWidth = resolvedStyle === "overlay" ? width - 150 : width - 210;
    const lines = wrapCanvasText(ctx, copy, maxTextWidth);
    const lineHeight = baseFont * 1.22;

    if (resolvedStyle === "paper") {
      const contentLines = lines.filter((line, index) => line || (index > 0 && index < lines.length - 1));
      const boxHeight = contentLines.length * lineHeight + 112;
      const boxY = format === "post" ? (height - boxHeight) / 2 : height * .57 - boxHeight / 2;
      ctx.fillStyle = "rgba(255,255,255,.94)";
      ctx.fillRect(70, boxY, width - 140, boxHeight);
      ctx.fillStyle = "#17211d";
      ctx.textAlign = "center";
      contentLines.forEach((line, index) => {
        ctx.fillText(line || " ", width / 2, boxY + 62 + lineHeight * index);
      });
    } else if (resolvedStyle === "stickers") {
      const visibleLines = lines.filter(Boolean);
      const groupHeight = visibleLines.length * (lineHeight + 12);
      let y = Math.min(height - groupHeight - 90, height * .66);
      ctx.textAlign = "center";
      visibleLines.forEach((line) => {
        const lineWidth = Math.min(ctx.measureText(line).width + 92, width - 70);
        roundedRect(ctx, (width - lineWidth) / 2, y, lineWidth, lineHeight + 18, 44);
        ctx.fillStyle = "rgba(255,255,255,.96)";
        ctx.fill();
        ctx.fillStyle = "#111816";
        ctx.fillText(line, width / 2, y + (lineHeight + 18) / 2);
        y += lineHeight + 12;
      });
    } else {
      const shade = ctx.createLinearGradient(0, height * .34, 0, height);
      shade.addColorStop(0, "rgba(15,30,24,0)");
      shade.addColorStop(.58, "rgba(15,30,24,.64)");
      shade.addColorStop(1, "rgba(15,30,24,.9)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#fffaf2";
      ctx.textAlign = "left";
      const startY = height - lines.length * lineHeight - 120;
      lines.forEach((line, index) => {
        ctx.fillText(line || " ", 72, startY + lineHeight * index);
      });
    }
  };

  if (!photoUrl) {
    paintBackground();
    return;
  }
  await new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => {
      paintBackground(image);
      resolve();
    };
    image.onerror = () => {
      paintBackground();
      resolve();
    };
    image.src = photoUrl;
  });
}

async function photoForAnalysis(photoUrl: string) {
  if (!photoUrl) return null;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const item = new Image();
    item.onload = () => resolve(item);
    item.onerror = reject;
    item.src = photoUrl;
  });
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", .76);
}

export default function Home() {
  const [format, setFormat] = useState<Format>("post");
  const [tone, setTone] = useState<Tone>("warm");
  const [goal, setGoal] = useState<Goal>("booking");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("paper");
  const [idea, setIdea] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [result, setResult] = useState<ReturnType<typeof buildContent> | null>(null);
  const [storyPlan, setStoryPlan] = useState<StoryPlan | null>(null);
  const [generationMode, setGenerationMode] = useState<"ai" | "demo" | "fallback">("demo");
  const [analyzePhoto, setAnalyzePhoto] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  useEffect(() => {
    if (!result || !canvasRef.current) return;
    void renderCreative(
      canvasRef.current,
      format,
      visualStyle,
      photoUrl,
      storyPlan ? `${storyPlan.headline}\n\n${storyPlan.body}` : buildVisualCopy(tone, goal, idea),
      storyPlan,
    );
  }, [result, format, visualStyle, photoUrl, tone, goal, idea, storyPlan]);

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

  const generate = async () => {
    setBusy(true);
    try {
      const photo = analyzePhoto && photoUrl ? await photoForAnalysis(photoUrl) : null;
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          tone,
          goal,
          idea,
          ...(photo ? { photo: { dataUrl: photo, name: photoName || "story-photo.jpg" } } : {}),
        }),
      });
      const data = await response.json() as { plan?: StoryPlan; mode?: "ai" | "demo" | "fallback"; error?: string };
      if (!response.ok || !data.plan) throw new Error(data.error || "Не удалось создать сторис");
      setStoryPlan(data.plan);
      setGenerationMode(data.mode || "fallback");
      setResult({
        title: "Цельная сторис",
        eyebrow: data.mode === "ai" ? "Создано ИИ-режиссёром" : "Демонстрационный режим",
        body: data.plan.caption,
        tags: "Проверьте факты и согласие клиента перед публикацией",
      });
    } catch {
      setStoryPlan(null);
      setGenerationMode("fallback");
      setResult(buildContent(format, tone, goal, idea));
      flash("ИИ временно недоступен — создан безопасный резервный вариант");
    } finally {
      setBusy(false);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
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
    if (!result || !canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `tiho-${format}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    flash("Готовая картинка скачана");
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Тихо — на главную">
          <span className="brand-dot" aria-hidden="true">т</span>
          <span>тихо</span>
        </a>
        <span className="privacy-pill"><span aria-hidden="true">●</span> Фото отправляются ИИ только с вашего согласия</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker">Контент-студия для массажиста</p>
          <h1>Пост готов.<br/><em>Можно выдохнуть.</em></h1>
          <p className="hero-text">Добавьте фото или мысль — получите готовую картинку для поста, сторис или обложки рилс без маркетолога и долгих раздумий.</p>
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
              {photoName && (
                <div className="photo-consent">
                  <p className="file-note">Фото выбрано: {photoName}.</p>
                  <label>
                    <input
                      type="checkbox"
                      checked={analyzePhoto}
                      onChange={(event) => setAnalyzePhoto(event.target.checked)}
                    />
                    <span><strong>Разрешить ИИ проанализировать фото</strong><small>Уменьшенная копия будет временно отправлена GigaChat и удалена после создания концепции.</small></span>
                  </label>
                </div>
              )}
              <div className="quick-ideas" aria-label="Быстрые идеи">
                {quickIdeas.map((item) => <button type="button" key={item} onClick={() => setIdea(item)}>+ {item}</button>)}
              </div>
              <div className="visual-picker">
                <strong>Предпочтительный стиль — ИИ сможет изменить его под идею</strong>
                <div className="visual-options">
                  {([
                    ["paper", "Белая плашка", "▭"],
                    ["stickers", "Стикеры", "▰"],
                    ["overlay", "На фото", "◩"],
                  ] as [VisualStyle, string, string][]).map(([id, label, icon]) => (
                    <button
                      type="button"
                      key={id}
                      className={visualStyle === id ? "active" : ""}
                      onClick={() => setVisualStyle(id)}
                      aria-pressed={visualStyle === id}
                    >
                      <span aria-hidden="true">{icon}</span>{label}
                    </button>
                  ))}
                </div>
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
              <span>{busy ? "ИИ продумывает сторис…" : "Создать сторис целиком"}</span>
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
              <p className="preview-caption"><strong>massage_marina</strong> {storyPlan?.headline || (result ? result.body.split("\n")[0] : "Новая сторис появится здесь после создания…")}</p>
            </div>
            <p className="preview-hint">Так публикация будет выглядеть в ленте</p>
          </aside>
        </div>
      </section>

      {result && (
        <section className="result-section" ref={resultRef} aria-live="polite">
          <div className="result-head">
            <div><p className="kicker">Готово к публикации</p><h2>Ваша картинка</h2></div>
            <span className="ready-badge">● {generationMode === "ai" ? "Создано ИИ" : "Демо-режим"}</span>
          </div>
          <div className="creative-result">
            <div className={`canvas-frame ${format === "post" ? "square" : "vertical"}`}>
              <canvas ref={canvasRef} aria-label={`Готовое изображение: ${selectedFormat.title}`} />
            </div>
            <div className="result-card">
              <p className="result-label">Дополнительная подпись</p>
              <pre>{result.body}</pre>
              <p className="tags">{result.tags}</p>
              <div className="result-actions">
                <button type="button" className="download-button" onClick={downloadCard}>Скачать готовую картинку</button>
                <button type="button" className="copy-button" onClick={copy}>Скопировать подпись</button>
                <button type="button" className="again-button" onClick={generate}>Другой вариант</button>
              </div>
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
