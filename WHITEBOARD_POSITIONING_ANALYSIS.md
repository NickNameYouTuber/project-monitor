# Анализ проблемы позиционирования Toolbar в Whiteboard

## Проблема
Toolbar с `absolute left-4 top-1/2 -translate-y-1/2` не центрируется правильно по вертикали. Нижний край группы находится в центре, а не центр группы.

## Разница между оригиналом и интегрированной версией

### Оригинал (whiteboard-frontend)
```
App.tsx: 
  div.w-screen.h-screen 
    → div.w-1/2.h-full.relative (фиксированная высота от h-screen)
      → WhiteboardPage: div.w-full.h-full.relative
        → Toolbar: absolute.left-4.top-1/2.-translate-y-1/2
```

**Цепочка высот:**
- `h-screen` (100vh) → `h-full` (100% от родителя) → `h-full` (100% от родителя)
- Toolbar позиционируется относительно WhiteboardPage, который имеет точную высоту = 100vh

### Интегрированная версия
```
App.tsx:
  div.min-h-screen 
    → div.flex.h-screen
      → main.flex-1.overflow-hidden
        → whiteboard-page: div.h-full.flex.flex-col
          → заголовок (фиксированная высота)
          → div.flex-1.relative.overflow-hidden
            → WhiteboardPageComponent: div.w-full.h-full.relative
              → Toolbar: absolute.left-4.top-1/2.-translate-y-1/2
```

**Цепочка высот:**
- `h-screen` → `flex-1` (растягивается) → `h-full` → `flex flex-col` → заголовок + `flex-1` → `h-full`
- Проблема: `flex-1` может не иметь правильной высоты, если flex-контейнер не настроен правильно

## Причина проблемы

1. **Absolute позиционирование работает относительно ближайшего positioned родителя** (`relative`, `absolute`, `fixed`)
2. `top-1/2` = 50% от высоты родителя (div с `relative`)
3. `-translate-y-1/2` = сдвиг на 50% собственной высоты элемента вверх
4. Если родительский контейнер не имеет правильной высоты, `top-1/2` считает от неправильной высоты

В интегрированной версии:
- Контейнер `div.flex-1.relative.overflow-hidden` может не иметь правильной высоты
- `flex-1` растягивается, но если родитель `div.h-full.flex.flex-col` не имеет правильной высоты, то и `flex-1` будет неправильным

## Варианты решения

### Вариант 1: Исправить цепочку высот (РЕКОМЕНДУЕТСЯ)
Убедиться, что все контейнеры в цепочке имеют правильную высоту:

```tsx
// whiteboard-page.tsx
<div className="h-full flex flex-col">
  <div className="border-b border-border p-6 flex-shrink-0">
    {/* заголовок */}
  </div>
  <div className="flex-1 relative overflow-hidden min-h-0">
    <WhiteboardPageComponent />
  </div>
</div>
```

**Ключевые изменения:**
- Добавить `flex-shrink-0` к заголовку (чтобы он не сжимался)
- Добавить `min-h-0` к `flex-1` контейнеру (чтобы flex правильно рассчитывал высоту)

### Вариант 2: Использовать fixed позиционирование
Изменить Toolbar и PropertiesPanel на `fixed`:

```tsx
// Toolbar.tsx
<div className="fixed left-4 top-1/2 -translate-y-1/2 ...">
```

**Плюсы:** Работает относительно viewport, не зависит от родителя
**Минусы:** Может выходить за границы контейнера whiteboard, не скроллится вместе с контентом

### Вариант 3: Использовать flexbox для центрирования
Вместо `absolute` использовать flexbox на родителе:

```tsx
// WhiteboardPage.tsx - обернуть Toolbar
<div className="w-full h-full relative overflow-hidden flex flex-col">
  <div className="absolute inset-0 flex items-center">
    <div className="absolute left-4">
      <Toolbar ... />
    </div>
  </div>
</div>
```

**Плюсы:** Более предсказуемое поведение
**Минусы:** Требует изменения структуры

### Вариант 4: Использовать CSS Grid
Использовать grid для позиционирования:

```tsx
// WhiteboardPage.tsx
<div className="w-full h-full relative overflow-hidden grid grid-cols-[auto_1fr]">
  <div className="flex items-center">
    <Toolbar ... />
  </div>
  <div>
    {/* canvas и остальное */}
  </div>
</div>
```

**Плюсы:** Надежное позиционирование
**Минусы:** Требует значительных изменений структуры

## Рекомендация

**Вариант 1** - самый простой и правильный. Проблема в том, что flex-контейнер не правильно рассчитывает высоту для `flex-1`. Добавление `min-h-0` решает эту проблему в большинстве случаев.
