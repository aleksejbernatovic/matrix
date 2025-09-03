// вспомогательные функции для "без дробей"
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
function rowGCD(row) {
  let g = 0;
  for (const x of row) {
    if (x !== 0) g = g === 0 ? Math.abs(x) : gcd(g, x);
    if (g === 1) break;
  }
  return g || 1;
}
function firstNonZeroIndex(row) {
  const idx = row.findIndex(x => Math.trunc(x) !== 0);
  return idx === -1 ? Infinity : idx;
}


function transformMatrixDefault(matrix, engine) {
  matrix.sort((a, b) => firstNonZeroIndex(a) - firstNonZeroIndex(b));
  engine.pushStep("Сортировка", matrix);
  const EPS = 1e-9;
  for (let i = 0; i < matrix.length; i++) {
    let first_line = matrix[i];
    let j = firstNonZeroIndex(first_line);
    if (j === Infinity) continue;
    for (let sub_i = i + 1; sub_i < matrix.length; sub_i++) {
      let curr_line = matrix[sub_i];
      let diff = curr_line[j] / first_line[j];
      if (Math.abs(diff) < EPS) continue;
      if (diff === 0) continue;
      for (let sub_j = j; sub_j < curr_line.length; sub_j++) {
        curr_line[sub_j] -= first_line[sub_j] * diff;
        if (Math.abs(curr_line[sub_j]) < EPS) curr_line[sub_j] = 0;
      }
      engine.pushStep(
          `R${sub_i+1} ← R${sub_i+1} − (${diff})·R${i+1}`,
          matrix
      );
    }
  }
  return matrix;
}

function transformMatrixIntegers(matrix, engine) {

  matrix.sort((a, b) => firstNonZeroIndex(a) - firstNonZeroIndex(b));
  engine.pushStep("Сортировка", matrix);

  for (let i = 0; i < matrix.length; i++) {
    const first_line = matrix[i];
    const j = firstNonZeroIndex(first_line);
    if (j === Infinity) continue;

    const a = first_line[j];
    for (let sub_i = i + 1; sub_i < matrix.length; sub_i++) {
      const curr_line = matrix[sub_i];
      const b = curr_line[j];
      if (b === 0) continue;

      const g = gcd(a, b);
      const m1 = a / g;
      const m2 = b / g;

      for (let sub_j = j; sub_j < curr_line.length; sub_j++) {
        curr_line[sub_j] = m1 * curr_line[sub_j] - m2 * first_line[sub_j];
      }

      const rg = rowGCD(curr_line.slice(j));
      if (rg > 1) {
        for (let c = j; c < curr_line.length; c++) curr_line[c] /= rg;
      }
      engine.pushStep(
          `R${sub_i+1} ← (${m1})·R${sub_i+1} − (${m2})·R${i+1}` + (rg>1?`, ÷${rg}`:""),
          matrix
      );
    }
  }
  return matrix;
}

// === Главная функция: выбирает метод по чекбоксу ===
function transformMatrix(matrix, engine) {
  const noFractions = document.querySelector("#no-fractions")?.checked;
  if (noFractions) {
    return transformMatrixIntegers(matrix, engine);
  } else {
    return transformMatrixDefault(matrix, engine);
  }
}