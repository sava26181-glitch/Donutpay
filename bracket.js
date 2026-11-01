// Генератор турнирной сетки: single и double elimination.
// Участник — строка (id пользователя). BYE означает «пустое место»: соперника не будет.
export const BYE = "BYE";

const mid = (b, r, s) => `${b}${r}-${s}`;
const pow2 = n => 2 ** Math.ceil(Math.log2(Math.max(n, 2)));

// порядок посева: 1 и 2 встречаются только в финале
export function seedOrder(size) {
  let o = [1];
  while (o.length < size) { const n = o.length * 2; o = o.flatMap(s => [s, n + 1 - s]); }
  return o;
}

// ids отсортированы по сиду (лучший первый). Возвращает массив матчей.
export function buildBracket(ids, type) {
  const size = pow2(ids.length), k = Math.log2(size);
  if (type === "double" && size < 4) throw new Error("double elimination needs 3+ players");
  const M = new Map();
  const add = (b, r, s) => M.set(mid(b, r, s), { code: mid(b, r, s), bracket: b, round: r, slot: s, p1: null, p2: null, winner: null, loser: null, status: "pending" });

  for (let r = 1; r <= k; r++) for (let s = 0; s < size / 2 ** r; s++) add("W", r, s);
  const order = seedOrder(size);
  for (let s = 0; s < size / 2; s++) {
    const m = M.get(mid("W", 1, s));
    m.p1 = ids[order[2 * s] - 1] ?? BYE;
    m.p2 = ids[order[2 * s + 1] - 1] ?? BYE;
  }
  for (let r = 1; r < k; r++) for (let s = 0; s < size / 2 ** r; s++)
    M.get(mid("W", r, s)).winnerTo = { match: mid("W", r + 1, s >> 1), side: s % 2 ? "p2" : "p1" };

  if (type === "double") {
    const lbRounds = 2 * (k - 1);
    const cntOf = r => size / 2 ** (Math.floor((r + 1) / 2) + 1);
    for (let r = 1; r <= lbRounds; r++) for (let s = 0; s < cntOf(r); s++) add("L", r, s);
    add("GF", 1, 0);
    for (let s = 0; s < size / 2; s++)
      M.get(mid("W", 1, s)).loserTo = { match: mid("L", 1, s >> 1), side: s % 2 ? "p2" : "p1" };
    for (let r = 1; r <= lbRounds; r++) for (let s = 0; s < cntOf(r); s++) {
      const m = M.get(mid("L", r, s));
      if (r < lbRounds) {
        m.winnerTo = r % 2 === 0
          ? { match: mid("L", r + 1, s >> 1), side: s % 2 ? "p2" : "p1" }
          : { match: mid("L", r + 1, s), side: "p1" };
      } else m.winnerTo = { match: mid("GF", 1, 0), side: "p2" };
    }
    for (let r = 2; r <= k; r++) {
      const cnt = size / 2 ** r;
      for (let s = 0; s < cnt; s++)
        M.get(mid("W", r, s)).loserTo = { match: mid("L", 2 * (r - 1), cnt - 1 - s), side: "p2" };
    }
    M.get(mid("W", k, 0)).winnerTo = { match: mid("GF", 1, 0), side: "p1" };
  }

  for (const m of M.values()) settle(M, m);
  return M;
}

function settle(M, m) {
  if (m.status === "done" || m.p1 === null || m.p2 === null) return;
  if (m.p1 === BYE || m.p2 === BYE) report(M, m.code, m.p1 === BYE ? m.p2 : m.p1);
  else m.status = "ready";
}

// записать результат и продвинуть участников
export function report(M, code, winner) {
  const m = M.get(code);
  if (!m) throw new Error("no such match");
  if (m.status === "done") throw new Error("match already done");
  if (winner !== m.p1 && winner !== m.p2) throw new Error("winner is not in match");
  m.winner = winner; m.status = "done";
  m.loser = winner === m.p1 ? m.p2 : m.p1;
  const put = (to, who) => {
    if (!to || who === null) return;
    const t = M.get(to.match); t[to.side] = who; settle(M, t);
  };
  put(m.winnerTo, winner);
  put(m.loserTo, m.loser);
}

// код финального матча
export const finalCode = (type, size) => type === "double" ? "GF1-0" : mid("W", Math.log2(pow2(size)), 0);
