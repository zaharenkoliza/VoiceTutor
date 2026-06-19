import type { Task } from '../core/tutor/types';

export const tasks: Task[] = [
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
    starterCode: `# Задача 8: Комбинаторика
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
  },
  {
    id: 'ege-14',
    number: 14,
    title: 'Позиционные системы счисления',
    description: `Значение арифметического выражения:
3 · 4³⁸ + 2 · 4²³ + 4²⁰ + 3 · 4⁵ + 2 · 4⁴ + 1
записали в системе счисления с основанием 16.

Сколько значащих нулей содержится в этой записи?`,
    starterCode: `# Задача 14: Системы счисления
x = 3 * 4**38 + 2 * 4**23 + 4**20 + 3 * 4**5 + 2 * 4**4 + 1

`,
    expectedAnswer: '15',
    referenceSolution: `x = 3 * 4**38 + 2 * 4**23 + 4**20 + 3 * 4**5 + 2 * 4**4 + 1
hex_str = hex(x)[2:].upper()
# Считаем значащие нули (все нули в записи; ведущих нулей в hex() нет)
count = hex_str.count('0')
print(count)`,
  },
  {
    id: 'ege-15',
    number: 15,
    title: 'Истинность логического выражения',
    description: `Для какого наибольшего целого неотрицательного числа A выражение

((x ≤ 9) → (x · x ≤ A)) ∧ ((y · y ≤ A) → (y ≤ 9))

тождественно истинно при любых целых неотрицательных x и y?`,
    starterCode: `# Задача 15: Истинность логического выражения

`,
    expectedAnswer: '99',
    referenceSolution: `# Перебираем A от большого к малому
for A in range(10000, -1, -1):
    ok = True
    for x in range(1000):
        # (x <= 9) -> (x*x <= A)  эквивалентно  NOT(x<=9) OR (x*x<=A)
        if not (x > 9 or x * x <= A):
            ok = False
            break
    if not ok:
        continue
    for y in range(1000):
        # (y*y <= A) -> (y <= 9)  эквивалентно  NOT(y*y<=A) OR (y<=9)
        if not (y * y > A or y <= 9):
            ok = False
            break
    if ok:
        print(A)
        break`,
  },
  {
    id: 'ege-16',
    number: 16,
    title: 'Рекурсивные алгоритмы — факториал',
    description: `Алгоритм вычисления значения функции F(n), где n — натуральное число, задан следующими соотношениями:

F(n) = 1, если n = 1
F(n) = n · F(n − 1), если n > 1

Чему равно значение выражения F(2023) / F(2020)?`,
    starterCode: `# Задача 16: Рекурсивные алгоритмы

`,
    expectedAnswer: '8266912626',
    referenceSolution: `# F(n) = n! (факториал)
# F(2023) / F(2020) = 2023 * 2022 * 2021
result = 2023 * 2022 * 2021
print(result)`,
  },
  {
    id: 'ege-17',
    number: 17,
    title: 'Обработка целых чисел — количество пар',
    description: `В файле 17.txt содержится последовательность из 10 000 целых чисел от −1000 до 1000 (по одному числу в строке).
Определите количество пар элементов последовательности, в которых оба числа делятся на 3, а их сумма делится на 5.

Порядок элементов в паре не важен. Пара не может включать два одинаковых элемента последовательности (но может включать два элемента, равных по значению).`,
    starterCode: `# Задача 17: Количество пар
# Файл 17.txt уже находится в текущей папке

with open('17.txt') as f:
    data = [int(x) for x in f]

# Найдите пары (i, j), i < j, где оба числа делятся на 3
# и их сумма делится на 5

`,
    expectedAnswer: '1093797',
    referenceSolution: `with open('17.txt') as f:
    data = [int(x) for x in f]

# Отфильтруем числа, делящиеся на 3
div3 = [x for x in data if x % 3 == 0]

# Группируем по остатку от деления на 5
from collections import Counter
rem_count = Counter(x % 5 for x in div3)

# Пара (a, b) делится на 5, если (a%5 + b%5) % 5 == 0
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
    starterCode: `# Задача 23
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

# Через 10: кол-во путей 1→10 * кол-во путей 10→20
result = count_paths(1, 10) * count_paths(10, 20)
print(result)`,
  },
  {
    id: 'ege-25',
    number: 25,
    title: 'Обработка целых чисел — степени простых',
    description: `Напишите программу, которая перебирает целые числа, большие 700 000, в порядке возрастания и ищет среди них числа, которые являются степенью простого числа с натуральным показателем степени, большим 1.

В ответе запишите первое найденное число.

Пример: 4 = 2², 8 = 2³, 9 = 3², 25 = 5², ...`,
    starterCode: `# Задача 25: Степени простых чисел

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
  },
  {
    id: 'ege-27',
    number: 27,
    title: 'Программирование — обработка последовательности',
    description: `В файле 27.txt содержится последовательность чисел. В первой строке файла задано число N — количество чисел. В следующих строках записаны сами числа (по одному в строке, всего N чисел).
Рассматриваются все пары элементов последовательности (a_i, a_j), где i < j.

Найдите максимальное произведение среди пар, в которых:
1) оба элемента пары чётные;
2) хотя бы один элемент пары больше 100.

Выведите максимальное произведение.`,
    starterCode: `# Задача 27: Максимальное произведение пары
# Файл 27.txt уже находится в текущей папке

with open('27.txt') as f:
    n = int(f.readline())
    data = [int(line) for line in f]

`,
    expectedAnswer: '100000000',
    referenceSolution: `with open('27.txt') as f:
    n = int(f.readline())
    data = [int(line) for line in f]

# Эффективное решение O(n):
# Нужны два наибольших чётных числа (одно из них точно > 100)
max1 = -1  # наибольшее чётное
max2 = -1  # второе по величине чётное

for x in data:
    if x % 2 == 0:
        if x > max1:
            max2 = max1
            max1 = x
        elif x > max2:
            max2 = x

# Проверяем условие: хотя бы одно > 100
if max1 > 100 or max2 > 100:
    print(max1 * max2)
else:
    print(-1)`,
  },
];
