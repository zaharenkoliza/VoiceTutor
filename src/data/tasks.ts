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
  {
    id: 'pilot-a-17', number: 17, title: 'Пары с заданной суммой', category: 'experiment',
    description: `Дана последовательность: 12, 7, 18, 3, 22, 8, 15, 10. Сколько неупорядоченных пар различных позиций имеют сумму, кратную 10?`,
    starterCode: `data = [12, 7, 18, 3, 22, 8, 15, 10]\n# Выведите количество пар\n`,
    expectedAnswer: '5',
    referenceSolution: `data = [12, 7, 18, 3, 22, 8, 15, 10]\nprint(sum((data[i] + data[j]) % 10 == 0 for i in range(len(data)) for j in range(i + 1, len(data))))`,
  },
  {
    id: 'pilot-a-24', number: 24, title: 'Самая длинная серия A', category: 'experiment',
    description: `Дана строка AABBAAAABBBAAAAAAB. Определите максимальное число подряд идущих символов A.`,
    starterCode: `s = 'AABBAAAABBBAAAAAAB'\n# Выведите длину максимальной серии A\n`,
    expectedAnswer: '6',
    referenceSolution: `s = 'AABBAAAABBBAAAAAAB'\nprint(max(map(len, s.split('B'))))`,
  },
  {
    id: 'pilot-b-17', number: 17, title: 'Соседние пары', category: 'experiment',
    description: `Дана последовательность: 5, 12, 9, 18, 4, 21, 6, 7. Сколько соседних пар содержат ровно одно число, кратное 3?`,
    starterCode: `data = [5, 12, 9, 18, 4, 21, 6, 7]\n# Выведите количество соседних пар\n`,
    expectedAnswer: '4',
    referenceSolution: `data = [5, 12, 9, 18, 4, 21, 6, 7]\nprint(sum((a % 3 == 0) != (b % 3 == 0) for a, b in zip(data, data[1:])))`,
  },
  {
    id: 'pilot-b-24', number: 24, title: 'Самая длинная серия цифр', category: 'experiment',
    description: `Дана строка AB1234CD56EF78901G. Определите максимальное число подряд идущих цифр.`,
    starterCode: `s = 'AB1234CD56EF78901G'\n# Выведите длину максимальной серии цифр\n`,
    expectedAnswer: '5',
    referenceSolution: `s = 'AB1234CD56EF78901G'\nbest = cur = 0\nfor c in s:\n    cur = cur + 1 if c.isdigit() else 0\n    best = max(best, cur)\nprint(best)`,
  },
  // ═══════════════════════════════════════════════════════════════════
  // EXPERIMENT SET A
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'ege-17',
    number: 17,
    title: 'Количество пар',
    description: `В файле 17.txt содержится последовательность из 10 000 целых чисел от −1000 до 1000 (по одному числу в строке).
Определите количество пар элементов последовательности, в которых оба числа делятся на 3, а их сумма делится на 5.

Порядок элементов в паре не важен. Пара не может включать два одинаковых элемента последовательности (но может включать два элемента, равных по значению).`,
    starterCode: `# Задание формата ЕГЭ №17: Количество пар
# Файл 17.txt уже находится в текущей папке

with open('17.txt') as f:
    data = [int(x) for x in f]

`,
    expectedAnswer: '1093797',
    referenceSolution: `with open('17.txt') as f:
    data = [int(x) for x in f]

div3 = [x for x in data if x % 3 == 0]

from collections import Counter
rem_count = Counter(x % 5 for x in div3)

count = 0
for r1 in rem_count:
    for r2 in rem_count:
        if (r1 + r2) % 5 == 0:
            if r1 < r2:
                count += rem_count[r1] * rem_count[r2]
            elif r1 == r2:
                n = rem_count[r1]
                count += n * (n - 1) // 2
print(count)`,
    category: 'experiment',
  },
  {
    id: 'ege-25',
    number: 25,
    title: 'Степени простых',
    description: `Напишите программу, которая перебирает целые числа, большие 700 000, в порядке возрастания и ищет среди них числа, которые являются степенью простого числа с натуральным показателем степени, большим 1.

В ответе запишите первое найденное число.

Пример: 4 = 2², 8 = 2³, 9 = 3², 25 = 5², ...`,
    starterCode: `# Задание формата ЕГЭ №25: Степени простых чисел

`,
    expectedAnswer: '703921',
    referenceSolution: `def is_prime(n):
    if n < 2:
        return False
    if n < 4:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

def is_prime_power(n):
    for k in range(2, 64):
        root = round(n ** (1.0 / k))
        for r in [root - 1, root, root + 1]:
            if r >= 2 and r ** k == n and is_prime(r):
                return True
        if 2 ** k > n:
            break
    return False

n = 700001
while True:
    if is_prime_power(n):
        print(n)
        break
    n += 1`,
    category: 'experiment',
  },
  {
    id: 'ege-27',
    number: 27,
    title: 'Максимальное произведение пары',
    description: `В файле 27.txt содержится последовательность чисел. В первой строке файла задано число N — количество чисел. В следующих строках записаны сами числа (по одному в строке, всего N чисел).
Рассматриваются все пары элементов последовательности (a_i, a_j), где i < j.

Найдите максимальное произведение среди пар, в которых:
1) оба элемента пары чётные;
2) хотя бы один элемент пары больше 100.

Выведите максимальное произведение.`,
    starterCode: `# Задание формата ЕГЭ №27: Максимальное произведение пары
# Файл 27.txt уже находится в текущей папке

with open('27.txt') as f:
    n = int(f.readline())
    data = [int(line) for line in f]

`,
    expectedAnswer: '100000000',
    referenceSolution: `with open('27.txt') as f:
    n = int(f.readline())
    data = [int(line) for line in f]

max1 = -1
max2 = -1

for x in data:
    if x % 2 == 0:
        if x > max1:
            max2 = max1
            max1 = x
        elif x > max2:
            max2 = x

if max1 > 100 or max2 > 100:
    print(max1 * max2)
else:
    print(-1)`,
    category: 'experiment',
  },

  // ═══════════════════════════════════════════════════════════════════
  // EXPERIMENT SET B
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'ege-17b',
    number: 17,
    title: 'Количество делителей',
    description: `В файле 17.txt содержится последовательность из 10 000 целых чисел от −1000 до 1000 (по одному числу в строке).
Определите количество пар элементов последовательности, в которых оба числа делятся на 7, а их произведение делится на 5.

Порядок элементов в паре не важен. Пара не может включать два одинаковых элемента последовательности (но может включать два элемента, равных по значению).`,
    starterCode: `# Задание формата ЕГЭ №17: Количество пар (вариант B)
# Файл 17.txt уже находится в текущей папке

with open('17.txt') as f:
    data = [int(x) for x in f]

`,
    expectedAnswer: '383235',
    referenceSolution: `with open('17.txt') as f:
    data = [int(x) for x in f]

div7 = [x for x in data if x % 7 == 0]

count = 0
for i in range(len(div7)):
    for j in range(i + 1, len(div7)):
        if (div7[i] * div7[j]) % 5 == 0:
            count += 1
print(count)`,
    category: 'experiment',
  },
  {
    id: 'ege-25b',
    number: 25,
    title: 'Палиндромные числа',
    description: `Напишите программу, которая перебирает целые числа, большие 500 000, в порядке возрастания и ищет среди них числа, запись которых в десятичной системе счисления является палиндромом (читается одинаково слева направо и справа налево) и при этом делится на 7.

В ответе запишите первое найденное число.

Пример палиндромов: 121, 1331, 505505, ...`,
    starterCode: `# Задание формата ЕГЭ №25: Палиндромные числа

`,
    expectedAnswer: '505505',
    referenceSolution: `n = 500001
while True:
    s = str(n)
    if s == s[::-1] and n % 7 == 0:
        print(n)
        break
    n += 1`,
    category: 'experiment',
  },
  {
    id: 'ege-27b',
    number: 27,
    title: 'Минимальная разность пары',
    description: `В файле 27.txt содержится последовательность чисел. В первой строке файла задано число N — количество чисел. В следующих строках записаны сами числа (по одному в строке, всего N чисел).
Рассматриваются все пары элементов последовательности (a_i, a_j), где i < j.

Найдите минимальную абсолютную разность |a_i - a_j| среди пар, в которых:
1) оба элемента пары нечётные;
2) оба элемента пары больше 50.

Выведите минимальную абсолютную разность.`,
    starterCode: `# Задание формата ЕГЭ №27: Минимальная разность пары
# Файл 27.txt уже находится в текущей папке

with open('27.txt') as f:
    n = int(f.readline())
    data = [int(line) for line in f]

`,
    expectedAnswer: '0',
    referenceSolution: `with open('27.txt') as f:
    n = int(f.readline())
    data = [int(line) for line in f]

odd_gt50 = sorted([x for x in data if x % 2 == 1 and x > 50])

min_diff = float('inf')
for i in range(len(odd_gt50) - 1):
    diff = odd_gt50[i + 1] - odd_gt50[i]
    if diff < min_diff:
        min_diff = diff

print(min_diff)`,
    category: 'experiment',
  },

  // ═══════════════════════════════════════════════════════════════════
  // PRACTICE TASKS (for familiarization, not analyzed)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'practice-text',
    number: 25,
    title: 'Сумма цифр (тренировочное)',
    description: `Тренировочное задание для знакомства с интерфейсом.

Напишите программу, которая находит наименьшее натуральное число, большее 100, сумма цифр которого равна 10.

Выведите найденное число.`,
    starterCode: `# Тренировочное задание: Сумма цифр
# Используйте это задание для знакомства с интерфейсом

`,
    expectedAnswer: '109',
    referenceSolution: `n = 101
while True:
    if sum(int(d) for d in str(n)) == 10:
        print(n)
        break
    n += 1`,
    category: 'practice',
  },
  {
    id: 'practice-voice',
    number: 17,
    title: 'Подсчёт элементов (тренировочное)',
    description: `Тренировочное задание для знакомства с голосовым вводом.

В файле 17.txt содержится последовательность из 10 000 целых чисел от −1000 до 1000.
Определите, сколько чисел в этой последовательности делятся на 3 и на 5 одновременно.`,
    starterCode: `# Тренировочное задание: Подсчёт элементов
# Файл 17.txt уже находится в текущей папке

with open('17.txt') as f:
    data = [int(x) for x in f]

`,
    expectedAnswer: '664',
    referenceSolution: `with open('17.txt') as f:
    data = [int(x) for x in f]

count = sum(1 for x in data if x % 15 == 0)
print(count)`,
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
