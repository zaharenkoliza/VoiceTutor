import type { Task } from '../core/tutor/types.js';

/**
 * Task bank for VoiceTutor.
 *
 * Tasks marked as 'experiment' are used in the within-subjects study (sets A and B).
 * Tasks marked as 'practice' are for familiarization (not analyzed).
 * Tasks marked as 'training' are for free practice mode.
 *
 * All tasks are author-created tasks in the format of EGE exam problems.
 * They are NOT official EGE problems.
 *
 * Task sets A and B are CANDIDATES for the pilot study.
 * Difficulty equivalence has NOT been verified.
 */

export const tasks: Task[] = [
  // ═══════════════════════════════════════════════════════════════════
  // EXPERIMENT SET A
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'pilot-a-17',
    number: 17,
    title: 'Соседние пары — делимость на 3',
    category: 'experiment',
    description: `Дана последовательность из 36 целых чисел:

data = [84, 25, 73, 42, 61, 96, 17, 58, 39, 74, 81, 22, 67, 45, 59, 90, 14, 77, 33, 68, 27, 88, 52, 63, 71, 48, 19, 93, 56, 41, 72, 29, 64, 87, 35, 78]

Определите количество пар соседних элементов (data[i], data[i+1]), в которых:
1) ровно одно число из пары делится на 3;
2) сумма пары строго больше 100.`,
    starterCode: `data = [84, 25, 73, 42, 61, 96, 17, 58, 39, 74, 81, 22, 67, 45, 59, 90, 14, 77, 33, 68, 27, 88, 52, 63, 71, 48, 19, 93, 56, 41, 72, 29, 64, 87, 35, 78]\n\n`,
    expectedAnswer: '25',
    referenceSolution: `data = [84, 25, 73, 42, 61, 96, 17, 58, 39, 74, 81, 22, 67, 45, 59, 90, 14, 77, 33, 68, 27, 88, 52, 63, 71, 48, 19, 93, 56, 41, 72, 29, 64, 87, 35, 78]\nprint(sum((a % 3 == 0) != (b % 3 == 0) and a + b > 100 for a, b in zip(data, data[1:])))`,
  },
  {
    id: 'pilot-a-24',
    number: 24,
    title: 'Максимальная серия чётных цифр',
    category: 'experiment',
    description: `Дана строка, состоящая из цифр:

s = "482046135802468024791246802357902468135724680246801357924680"

Определите максимальное количество подряд идущих чётных цифр в этой строке.

Чётные цифры: 0, 2, 4, 6, 8.`,
    starterCode: `s = "482046135802468024791246802357902468135724680246801357924680"\n\n`,
    expectedAnswer: '10',
    referenceSolution: `s = "482046135802468024791246802357902468135724680246801357924680"\nbest = cur = 0\nfor c in s:\n    if int(c) % 2 == 0:\n        cur += 1\n        best = max(best, cur)\n    else:\n        cur = 0\nprint(best)`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // EXPERIMENT SET B
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'pilot-b-17',
    number: 17,
    title: 'Соседние пары — делимость на 4',
    category: 'experiment',
    description: `Дана последовательность из 36 целых чисел:

data = [76, 31, 92, 44, 57, 83, 28, 64, 39, 71, 88, 26, 53, 97, 36, 69, 42, 81, 24, 75, 62, 47, 84, 33, 58, 91, 52, 79, 48, 66, 27, 73, 56, 89, 32, 68]

Определите количество пар соседних элементов (data[i], data[i+1]), в которых:
1) ровно одно число из пары делится на 4;
2) сумма пары строго больше 100.`,
    starterCode: `data = [76, 31, 92, 44, 57, 83, 28, 64, 39, 71, 88, 26, 53, 97, 36, 69, 42, 81, 24, 75, 62, 47, 84, 33, 58, 91, 52, 79, 48, 66, 27, 73, 56, 89, 32, 68]\n\n`,
    expectedAnswer: '19',
    referenceSolution: `data = [76, 31, 92, 44, 57, 83, 28, 64, 39, 71, 88, 26, 53, 97, 36, 69, 42, 81, 24, 75, 62, 47, 84, 33, 58, 91, 52, 79, 48, 66, 27, 73, 56, 89, 32, 68]\nprint(sum((a % 4 == 0) != (b % 4 == 0) and a + b > 100 for a, b in zip(data, data[1:])))`,
  },
  {
    id: 'pilot-b-24',
    number: 24,
    title: 'Максимальная серия нечётных цифр',
    category: 'experiment',
    description: `Дана строка, состоящая из цифр:

s = "135791246813579135802357913579246801357913579246802468135791"

Определите максимальное количество подряд идущих нечётных цифр в этой строке.

Нечётные цифры: 1, 3, 5, 7, 9.`,
    starterCode: `s = "135791246813579135802357913579246801357913579246802468135791"\n\n`,
    expectedAnswer: '10',
    referenceSolution: `s = "135791246813579135802357913579246801357913579246802468135791"\nbest = cur = 0\nfor c in s:\n    if int(c) % 2 == 1:\n        cur += 1\n        best = max(best, cur)\n    else:\n        cur = 0\nprint(best)`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // PRACTICE TASKS (for familiarization, not analyzed)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'practice-text',
    number: 0,
    title: 'Тренировка текстового ввода',
    description: `Это короткая тренировка. Просто задайте тьютору любой вопрос текстом, чтобы убедиться, что всё работает.

Пример: «Что такое переменная в Python?»

Когда убедитесь, что получили ответ — введите число 1 и отправьте.`,
    starterCode: `# Тренировка: задайте тьютору вопрос текстом\n`,
    expectedAnswer: '1',
    referenceSolution: `print(1)`,
    category: 'practice',
  },
  {
    id: 'practice-voice',
    number: 0,
    title: 'Тренировка голосового ввода',
    description: `Это короткая тренировка. Нажмите кнопку микрофона и задайте тьютору любой вопрос голосом, чтобы убедиться, что всё работает.

Пример: «Как вывести текст на экран в Python?»

Когда убедитесь, что получили ответ — введите число 1 и отправьте.`,
    starterCode: `# Тренировка: задайте тьютору вопрос голосом\n`,
    expectedAnswer: '1',
    referenceSolution: `print(1)`,
    category: 'practice',
  },

  // ═══════════════════════════════════════════════════════════════════
  // TRAINING TASKS (free practice mode)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'ege-8',
    number: 8,
    title: 'Комбинаторика — слова в алфавитном порядке',
    description: `Все семибуквенные слова, составленные из букв К, О, Т, Е, Н, А записаны в алфавитном порядке и пронумерованы. Ниже приведено начало списка.
1. ААААААА
2. ААААААЕ
3. ААААААК
4. ААААААН
5. ААААААО
6. ААААААТ
...

Определите, под каким номером в этом списке стоит последнее слово с нечётным номером, которое может быть получено перестановкой букв в слове КОТЕНОК.`,
    starterCode: `# Задание формата ЕГЭ №8: Комбинаторика
from itertools import permutations

`,
    expectedAnswer: '270297',
    referenceSolution: `from itertools import permutations

word_letters = list('КОТЕНОК')
alphabet = sorted(set(list('КОТЕНА')))  # А, Е, К, Н, О, Т

def word_number(word):
    base = len(alphabet)
    number = 0
    for ch in word:
        number = number * base + alphabet.index(ch)
    return number + 1

perms = set(permutations(word_letters))
nums = sorted([word_number(p) for p in perms])
odd_nums = [n for n in nums if n % 2 == 1]
print(odd_nums[-1])`,
    category: 'training',
  },
  {
    id: 'ege-14',
    number: 14,
    title: 'Позиционные системы счисления',
    description: `Значение арифметического выражения:
3 · 4³⁸ + 2 · 4²³ + 4²⁰ + 3 · 4⁵ + 2 · 4⁴ + 1
записали в системе счисления с основанием 16.

Сколько значащих нулей содержится в этой записи?`,
    starterCode: `# Задание формата ЕГЭ №14: Системы счисления
x = 3 * 4**38 + 2 * 4**23 + 4**20 + 3 * 4**5 + 2 * 4**4 + 1

`,
    expectedAnswer: '15',
    referenceSolution: `x = 3 * 4**38 + 2 * 4**23 + 4**20 + 3 * 4**5 + 2 * 4**4 + 1
hex_str = hex(x)[2:].upper()
count = hex_str.count('0')
print(count)`,
    category: 'training',
  },
  {
    id: 'ege-15',
    number: 15,
    title: 'Истинность логического выражения',
    description: `Для какого наибольшего целого неотрицательного числа A выражение

((x ≤ 9) → (x · x ≤ A)) ∧ ((y · y ≤ A) → (y ≤ 9))

тождественно истинно при любых целых неотрицательных x и y?`,
    starterCode: `# Задание формата ЕГЭ №15: Истинность логического выражения

`,
    expectedAnswer: '99',
    referenceSolution: `for A in range(10000, -1, -1):
    ok = True
    for x in range(1000):
        if not (x > 9 or x * x <= A):
            ok = False
            break
    if not ok:
        continue
    for y in range(1000):
        if not (y * y > A or y <= 9):
            ok = False
            break
    if ok:
        print(A)
        break`,
    category: 'training',
  },
  {
    id: 'ege-16',
    number: 16,
    title: 'Рекурсивные алгоритмы — факториал',
    description: `Алгоритм вычисления значения функции F(n), где n — натуральное число, задан следующими соотношениями:

F(n) = 1, если n = 1
F(n) = n · F(n − 1), если n > 1

Чему равно значение выражения F(2023) / F(2020)?`,
    starterCode: `# Задание формата ЕГЭ №16: Рекурсивные алгоритмы

`,
    expectedAnswer: '8266912626',
    referenceSolution: `result = 2023 * 2022 * 2021
print(result)`,
    category: 'training',
  },
  {
    id: 'ege-23',
    number: 23,
    title: 'Динамическое программирование — исполнитель',
    description: `Исполнитель преобразует число на экране.
У исполнителя есть две команды, которым присвоены номера:
1. Прибавить 1
2. Умножить на 2

Первая команда увеличивает число на экране на 1, вторая умножает его на 2.
Программа для исполнителя — это последовательность команд.

Сколько существует программ, для которых при исходном числе 1 результатом является число 20, и при этом траектория вычислений содержит число 10?`,
    starterCode: `# Задание формата ЕГЭ №23
def count_paths(start, end):
    pass

`,
    expectedAnswer: '28',
    referenceSolution: `def count_paths(start, end):
    dp = [0] * (end + 1)
    dp[start] = 1
    for i in range(start, end):
        if dp[i] > 0:
            if i + 1 <= end:
                dp[i + 1] += dp[i]
            if i * 2 <= end:
                dp[i * 2] += dp[i]
    return dp[end]

result = count_paths(1, 10) * count_paths(10, 20)
print(result)`,
    category: 'training',
  },
];

export function getTaskById(id: string): Task | undefined {
  return tasks.find((task) => task.id === id);
}
