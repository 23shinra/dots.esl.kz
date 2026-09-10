# dots — landing

Лендинг для `dots` — сети точек-контейнеров для дешёвой P2P-доставки по Алматы.

## Стек

- **Flask 3** (application factory) + **Flask-WTF** (CSRF)
- **Jinja2** шаблоны
- **HTMX** — форма waitlist без перезагрузки
- **GSAP + ScrollTrigger** — sticky storytelling анимации
- Чистый CSS (без Tailwind), кастомные шрифты Unbounded / Space Grotesk / JetBrains Mono

## Структура

```
app/
  __init__.py          # app factory
  routes/
    main.py            # index + waitlist endpoint
  templates/
    base.html
    index.html
    partials/
      waitlist_success.html
      waitlist_error.html
  static/
    css/style.css
    js/animations.js
config.py
run.py
requirements.txt
```

## Запуск локально (Windows / PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env       # отредактируй SECRET_KEY
python run.py
```

Открыть: http://localhost:5000

## Что делает лендинг

Сюжет скролла:

1. **Hero** — большое заявление + метрики (−50%, 100₸/точка, 24/7). Слова-заголовки с stagger.
2. **Problem** (sticky) — строки проблемы появляются по очереди, гигантский красный счётчик тикает до **3280 ₸**, финальный вердикт «это грабёж».
3. **Transition** — мост: «а что если город сам двигает твою посылку?».
4. **How** (sticky) — слева 3 шага, справа SVG-карта Алматы, посылка едет по маршруту, точки зажигаются, цена тикает 100→500 ₸.
5. **Compare** — две карточки: 3000 ₸ (Яндекс) vs 1500 ₸ (dots), счётчики анимируются, блок экономии.
6. **Manifesto** — бегущая строка-marquee.
7. **Waitlist** — HTMX-форма с CSRF → JSONL-файл `waitlist.jsonl` в корне.

## Дальше (когда будешь расширять)

- Заменить `waitlist.jsonl` на SQLite через Flask-SQLAlchemy + Flask-Migrate.
- Добавить `pricing` блюпринт: калькулятор «откуда → куда» по точкам × 100 ₸.
- Карта реальных dot-точек (Leaflet + 2GIS / OSM тайлы).
- Telegram-бот для выдачи пин-кодов.
# deploy test 1776849576
# deploy test2 1776849600
# deploy test3 1776849621
