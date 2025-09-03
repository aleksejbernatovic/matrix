/* ===== Простая утилита работы с матрицами и историей ===== */

const $ = (sel) => document.querySelector(sel);

const deepCopy = (m) => m.map((row) => row.slice());

function createTable(rows, cols) {
  const table = $("#input-table");
  table.innerHTML = "";
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < cols; c++) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.value = "0";
      input.inputMode = "decimal";
      td.appendChild(input);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

function readTable() {
  const rows = [];
  const table = $("#input-table");
  const trs = table.querySelectorAll("tr");
  trs.forEach((tr) => {
    const row = [];
    tr.querySelectorAll("input").forEach((inp) => {
      const v = inp.value.trim();
      row.push(v === "" ? 0 : Number(v));
    });
    rows.push(row);
  });
  return rows;
}

function renderMatrix(tableEl, matrix, highlightChangesFrom = null) {
  tableEl.innerHTML = "";
  matrix.forEach((row, r) => {
    const tr = document.createElement("tr");
    row.forEach((val, c) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.value = String(val);
      input.readOnly = true;

      // Подсветить изменённые ячейки
      if (highlightChangesFrom && highlightChangesFrom[r] && highlightChangesFrom[r][c] !== val) {
        input.classList.add("cell-changed");
        input.title = `Было: ${highlightChangesFrom[r][c]}, стало: ${val}`;
      }

      td.appendChild(input);
      tr.appendChild(td);
    });
    tableEl.appendChild(tr);
  });
}

// Diff для истории
function diffMatrices(A, B) {
  const changes = [];
  const rows = Math.max(A.length, B.length);
  for (let r = 0; r < rows; r++) {
    const cols = Math.max(A[r]?.length || 0, B[r]?.length || 0);
    for (let c = 0; c < cols; c++) {
      const av = A[r]?.[c];
      const bv = B[r]?.[c];
      if (av !== bv) {
        changes.push({ row: r, col: c, from: av, to: bv });
      }
    }
  }
  return { count: changes.length, changes };
}

/* ===== "Движок" шагов для вашей логики ===== */
const MatrixEngine = {
  steps: [],
  before: null,
  start(before) { this.steps = []; this.before = deepCopy(before); },
  pushStep(description, matrixSnapshot) {
    this.steps.push({ description, after: deepCopy(matrixSnapshot) });
  },
  finish(final) {
    const result = {
      timestamp: new Date().toISOString(),
      before: deepCopy(this.before),
      after: deepCopy(final),
      steps: this.steps.slice(),
    };
    this.steps = [];
    this.before = null;
    return result;
  },
};

// История всех применений
const History = {
  items: [],
  add(entry) { this.items.unshift(entry); saveToLocal(); },
  clear() { this.items = []; saveToLocal(); },
};

// Хранилище в localStorage (по желанию)
const LS_KEY = "matrix_history_v1";
function saveToLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(History.items)); } catch {}
}
function loadFromLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) History.items = JSON.parse(raw);
  } catch {}
}

/* ===== UI: история ===== */
function renderHistory() {
  const list = $("#history-list");
  list.innerHTML = "";
  if (History.items.length === 0) {
    list.innerHTML = `<p class="muted">Пока нет изменений. Нажмите «Применить преобразование», чтобы зафиксировать.</p>`;
    return;
  }

  History.items.forEach((item, idx) => {
    const { before, after, steps, timestamp } = item;
    const { count, changes } = diffMatrices(before, after);

    const div = document.createElement("div");
    div.className = "history-item";

    const head = document.createElement("div");
    head.className = "history-head";
    const title = document.createElement("div");
    title.innerHTML = `<strong>Шаг #${History.items.length - idx}</strong>`;
    const meta = document.createElement("div");
    const dt = new Date(timestamp);
    meta.className = "history-meta";
    meta.textContent = `${dt.toLocaleString()} • изменённых ячеек: ${count}`;
    head.appendChild(title);
    head.appendChild(meta);

    const diff = document.createElement("div");
    diff.className = "history-diff";
    if (count === 0) {
      diff.textContent = "Матрица не изменилась.";
    } else {
      const ul = document.createElement("ul");
      changes.slice(0, 8).forEach(({ row, col, from, to }) => {
        const li = document.createElement("li");
        li.textContent = `[${row + 1}, ${col + 1}]: ${from} → ${to}`;
        ul.appendChild(li);
      });
      diff.appendChild(ul);
      if (changes.length > 8) {
        const more = document.createElement("div");
        more.className = "muted";
        more.textContent = `…и ещё ${changes.length - 8}`;
        diff.appendChild(more);
      }
    }

    const stepsBox = document.createElement("div");
    stepsBox.className = "history-steps";
    if (steps?.length) {
      const label = document.createElement("div");
      label.className = "muted";
      label.textContent = "Промежуточные шаги вашей логики:";
      stepsBox.appendChild(label);

      steps.forEach((s, i) => {
        const step = document.createElement("div");
        step.className = "step";
        const desc = document.createElement("div");
        desc.className = "desc";
        desc.textContent = `Шаг ${i + 1}: ${s.description || "(без описания)"}`;
        const pre = document.createElement("pre");
        pre.textContent = matrixToString(s.after);
        step.appendChild(desc);
        step.appendChild(pre);
        stepsBox.appendChild(step);
      });
    } else {
      const none = document.createElement("div");
      none.className = "muted";
      none.textContent = "Шаги не записаны. (Можно логировать их из вашей функции)";
      stepsBox.appendChild(none);
    }

    div.appendChild(head);
    div.appendChild(diff);
    div.appendChild(stepsBox);
    list.appendChild(div);
  });
}

function matrixToString(m) {
  return m.map((row) => row.join(" ")).join("\n");
}


function fillRandom(min = -10, max = 10) {
  const table = $("#input-table");
  table.querySelectorAll("tr").forEach((tr) => {
    tr.querySelectorAll("input").forEach((inp) => {
      inp.value = Math.floor(Math.random() * (max - min + 1)) + min;
    });
  });
}
function updateTableFromInputs() {
  const r = Math.max(1, Number($("#rows").value) || 1);
  const c = Math.max(1, Number($("#cols").value) || 1);
  createTable(r, c);
}


/* ===== Инициализация и обработчики ===== */
document.addEventListener("DOMContentLoaded", () => {
  loadFromLocal();
  // Стартовая таблица 3x3
  createTable(Number($("#rows").value), Number($("#cols").value));

  $("#create-table").addEventListener("click", () => {
    const r = Math.max(1, Number($("#rows").value) || 1);
    const c = Math.max(1, Number($("#cols").value) || 1);
    createTable(r, c);
  });
  ["#rows", "#cols"].forEach(id => {
    $(id).addEventListener("input", updateTableFromInputs);
  });
  $("#fill-random").addEventListener("click", () => {
    const min = Number(document.getElementById("rand-min").value) || -10;
    const max = Number(document.getElementById("rand-max").value) || 10;
    const a = Math.min(min, max), b = Math.max(min, max); // на всякий случай поменяем местами
    fillRandom(a, b);
  });
  $("#import-text").addEventListener("click", () => {
    const text = $("#text-input").value.trim();
    if (!text) return;
    const rows = text.split(/\r?\n/).map((line) =>
      line.trim().split(/\s+/).map((t) => Number(t))
    );
    const r = rows.length;
    const c = Math.max(...rows.map((x) => x.length));
    $("#rows").value = r;
    $("#cols").value = c;
    createTable(r, c);
    // заполнить
    const table = $("#input-table");
    rows.forEach((row, i) => {
      row.forEach((val, j) => {
        const inp = table.querySelectorAll("tr")[i]?.querySelectorAll("input")[j];
        if (inp) inp.value = String(Number.isFinite(val) ? val : 0);
      });
    });
  });

  $("#apply").addEventListener("click", () => {
    const status = $("#status");
    const inputMatrix = readTable();
    MatrixEngine.start(inputMatrix);

    let outputMatrix;
    try {
      // ВАША логика преобразования находится в transform.js (функция transformMatrix)
      outputMatrix = transformMatrix(deepCopy(inputMatrix), MatrixEngine);
      if (!Array.isArray(outputMatrix)) throw new Error("transformMatrix должна вернуть двумерный массив");
    } catch (err) {
      status.textContent = `Ошибка: ${err.message || err}`;
      return;
    }

    // Зафиксировать в истории
    const entry = MatrixEngine.finish(outputMatrix);
    History.add(entry);

    // Показать результат + подсветить изменения
    renderMatrix($("#output-table"), outputMatrix, inputMatrix);
    status.textContent = "Готово.";
    setTimeout(() => (status.textContent = ""), 2000);
  });

  // История — модалка
  $("#history-btn").addEventListener("click", () => {
    renderHistory();
    $("#history-modal").classList.remove("hidden");
    $("#history-modal").setAttribute("aria-hidden", "false");
  });
  $("#close-history").addEventListener("click", () => {
    $("#history-modal").classList.add("hidden");
    $("#history-modal").setAttribute("aria-hidden", "true");
  });
  $("#clear-history").addEventListener("click", () => {
    if (confirm("Очистить историю?")) {
      History.clear();
      renderHistory();
    }
  });
});