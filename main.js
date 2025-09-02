// Yahtzee (Vanilla JS) — up to 4 players
// Features: hold/unhold dice, up to 3 rolls, pick category, upper-bonus, end-of-game total.

const CATEGORIES = [
  // Upper section
  "Ones","Twos","Threes","Fours","Fives","Sixes",
  // Lower section
  "Three of a Kind","Four of a Kind","Full House",
  "Small Straight","Large Straight","Yahtzee","Chance"
];

const UPPER = ["Ones","Twos","Threes","Fours","Fives","Sixes"];
const LOWER = ["Three of a Kind","Four of a Kind","Full House","Small Straight","Large Straight","Yahtzee","Chance"];

const STATE = {
  players: [],
  currentPlayer: 0,
  dice: [1,1,1,1,1],
  held: [false,false,false,false,false],
  rollsLeft: 3,
  sheets: [], // [{scores: Map, locked:Set, upperTotal, lowerTotal, bonus, grandTotal}]
  started: false
};

const els = {
  playerCount: document.getElementById("playerCount"),
  startBtn: document.getElementById("startGameBtn"),
  resetBtn: document.getElementById("resetGameBtn"),
  currentPlayerName: document.getElementById("currentPlayerName"),
  rollsLeft: document.getElementById("rollsLeft"),
  diceRow: document.getElementById("diceRow"),
  rollBtn: document.getElementById("rollBtn"),
  endTurnBtn: document.getElementById("endTurnBtn"),
  tableWrapper: document.getElementById("scoreTableWrapper"),
  exportStateBtn: document.getElementById("exportStateBtn"),
  importStateBtn: document.getElementById("importStateBtn"),
  importFile: document.getElementById("importFile"),
};

function $(id){ return document.getElementById(id); }

function getPlayerNames(){
  const n = parseInt(els.playerCount.value,10);
  const names = [];
  for (let i=0;i<4;i++){
    const val = ( $("p"+i).value || "" ).trim();
    if (i < n) names.push(val || `Player ${i+1}`);
  }
  return names;
}

function startGame(){
  STATE.players = getPlayerNames();
  STATE.sheets = STATE.players.map(()=> ({
    scores: new Map(),
    locked: new Set(),
    upperTotal: 0, lowerTotal: 0, bonus: 0, grandTotal: 0
  }));
  STATE.currentPlayer = 0;
  STATE.dice = [1,1,1,1,1];
  STATE.held = [false,false,false,false,false];
  STATE.rollsLeft = 3;
  STATE.started = true;

  renderDice();
  renderScoreTable();
  updateTurnInfo();
}

function resetGame(){
  Object.assign(STATE, {
    players: [],
    currentPlayer: 0,
    dice: [1,1,1,1,1],
    held: [false,false,false,false,false],
    rollsLeft: 3,
    sheets: [],
    started: false
  });
  els.tableWrapper.innerHTML = "";
  els.diceRow.innerHTML = "";
  updateTurnInfo();
}

function nextPlayer(){
  STATE.currentPlayer = (STATE.currentPlayer + 1) % STATE.players.length;
  STATE.dice = [1,1,1,1,1];
  STATE.held = [false,false,false,false,false];
  STATE.rollsLeft = 3;
  renderDice();
  updateTurnInfo();
}

function updateTurnInfo(){
  els.currentPlayerName.textContent = STATE.started ? STATE.players[STATE.currentPlayer] : "—";
  els.rollsLeft.textContent = STATE.rollsLeft.toString();
  els.rollBtn.disabled = !STATE.started || STATE.rollsLeft<=0;
}

function rollDieVal(){ return Math.floor(Math.random()*6)+1; }

function rollDice(){
  if (!STATE.started || STATE.rollsLeft<=0) return;
  STATE.dice = STATE.dice.map((v,i)=> STATE.held[i] ? v : rollDieVal());
  STATE.rollsLeft -= 1;
  renderDice();
  updateTurnInfo();
}

function toggleHold(i){
  if (!STATE.started) return;
  if (STATE.rollsLeft===3) return; // must roll once before holding
  STATE.held[i] = !STATE.held[i];
  renderDice();
}

function pipPositionsFor(value){
  // positions for a 64x64 die, roughly centered
  const centers = {
    1: [[32,32]],
    2: [[18,18],[46,46]],
    3: [[16,16],[32,32],[48,48]],
    4: [[18,18],[46,18],[18,46],[46,46]],
    5: [[18,18],[46,18],[32,32],[18,46],[46,46]],
    6: [[18,16],[46,16],[18,32],[46,32],[18,48],[46,48]],
  };
  return centers[value] || centers[1];
}

function renderDice(){
  els.diceRow.innerHTML = "";
  STATE.dice.forEach((v,i)=>{
    const btn = document.createElement("button");
    btn.className = "die" + (STATE.held[i] ? " held" : "");
    if (!STATE.started) btn.classList.add("disabled");
    btn.setAttribute("aria-pressed", STATE.held[i] ? "true" : "false");
    btn.title = STATE.held[i] ? "Click to unhold" : "Click to hold";
    btn.addEventListener("click", ()=> toggleHold(i));
    // Add pips
    pipPositionsFor(v).forEach(([x,y])=>{
      const dot = document.createElement("span");
      dot.className = "pip";
      dot.style.left = (x-3)+"px";
      dot.style.top = (y-3)+"px";
      btn.appendChild(dot);
    });
    // label (value)
    const lbl = document.createElement("span");
    lbl.style.position="absolute"; lbl.style.bottom="6px"; lbl.style.right="8px";
    lbl.style.fontSize="12px"; lbl.style.color="#94a3b8";
    lbl.textContent = v.toString();
    btn.appendChild(lbl);
    els.diceRow.appendChild(btn);
  });
}

function countByFace(dice){
  const c = [0,0,0,0,0,0,0]; // index 1..6
  dice.forEach(d => c[d]++);
  return c;
}

function sum(dice){ return dice.reduce((a,b)=>a+b,0); }

function isNOfAKind(dice, n){
  const c = countByFace(dice);
  return c.some(cnt => cnt>=n);
}

function isFullHouse(dice){
  const c = countByFace(dice);
  const has3 = c.some(cnt => cnt===3);
  const has2 = c.some(cnt => cnt===2);
  return has3 && has2;
}

function isSmallStraight(dice){
  const s = new Set(dice);
  const seqs = [[1,2,3,4],[2,3,4,5],[3,4,5,6]];
  return seqs.some(seq=> seq.every(v=> s.has(v)));
}

function isLargeStraight(dice){
  const s = new Set(dice);
  return ([1,2,3,4,5].every(v=>s.has(v)) || [2,3,4,5,6].every(v=>s.has(v)));
}

function scoreForCategory(cat, dice){
  const counts = countByFace(dice);
  switch(cat){
    case "Ones": return counts[1]*1;
    case "Twos": return counts[2]*2;
    case "Threes": return counts[3]*3;
    case "Fours": return counts[4]*4;
    case "Fives": return counts[5]*5;
    case "Sixes": return counts[6]*6;
    case "Three of a Kind": return isNOfAKind(dice,3) ? sum(dice) : 0;
    case "Four of a Kind": return isNOfAKind(dice,4) ? sum(dice) : 0;
    case "Full House": return isFullHouse(dice) ? 25 : 0;
    case "Small Straight": return isSmallStraight(dice) ? 30 : 0;
    case "Large Straight": return isLargeStraight(dice) ? 40 : 0;
    case "Yahtzee": return isNOfAKind(dice,5) ? 50 : 0;
    case "Chance": return sum(dice);
    default: return 0;
  }
}

function computeTotals(sheet){
  let upper = 0, lower = 0;
  UPPER.forEach(cat => { upper += sheet.scores.get(cat) || 0; });
  LOWER.forEach(cat => { lower += sheet.scores.get(cat) || 0; });
  const bonus = (upper >= 63) ? 35 : 0;
  const grand = upper + bonus + lower;
  sheet.upperTotal = upper;
  sheet.lowerTotal = lower;
  sheet.bonus = bonus;
  sheet.grandTotal = grand;
}

function hasGameEnded(){
  // End when all categories are locked for all players
  return STATE.sheets.every(s => s.locked.size === CATEGORIES.length);
}

function applyCategory(cat){
  const p = STATE.currentPlayer;
  const sheet = STATE.sheets[p];
  if (sheet.locked.has(cat)) return;

  const pts = scoreForCategory(cat, STATE.dice);
  sheet.scores.set(cat, pts);
  sheet.locked.add(cat);
  computeTotals(sheet);

  renderScoreTable();

  if (hasGameEnded()){
    endGame();
  }else{
    nextPlayer();
  }
}

function endGame(){
  // Find winner(s)
  const totals = STATE.sheets.map(s=>s.grandTotal);
  const max = Math.max(...totals);
  const winners = STATE.players.filter((_,i)=> totals[i]===max);
  alert(`Game Over! Winner: ${winners.join(", ")} with ${max} points.`);
  updateTurnInfo();
}

function renderScoreTable(){
  const table = document.createElement("table");
  table.className = "score-table";

  // header
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  const hCat = document.createElement("th");
  hCat.textContent = "Category";
  hr.appendChild(hCat);
  STATE.players.forEach((name, i)=>{
    const th = document.createElement("th");
    th.textContent = name;
    if (i===STATE.currentPlayer) th.style.outline = "2px solid var(--ring)";
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  CATEGORIES.forEach(cat=>{
    const tr = document.createElement("tr");
    const tdCat = document.createElement("td");
    tdCat.textContent = cat;
    tdCat.className = "category";
    tr.appendChild(tdCat);

    STATE.players.forEach((_, i)=>{
      const td = document.createElement("td");
      const sheet = STATE.sheets[i];
      if (sheet.locked.has(cat)){
        td.textContent = sheet.scores.get(cat) ?? 0;
        td.className = "locked";
      } else {
        td.textContent = i===STATE.currentPlayer ? scoreForCategory(cat, STATE.dice) : "";
        if (i===STATE.currentPlayer) {
          td.classList.add("pickable");
          td.title = `Set "${cat}" for this turn`;
          td.addEventListener("click", ()=> applyCategory(cat));
        }
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  // totals
  const tfoot = document.createElement("tfoot");
  const totals = [
    ["Upper Total", s=>s.upperTotal],
    ["Upper Bonus (+35 ≥ 63)", s=>s.bonus],
    ["Lower Total", s=>s.lowerTotal],
    ["Grand Total", s=>s.grandTotal]
  ];
  totals.forEach(([label, getter])=>{
    const tr = document.createElement("tr");
    const tdL = document.createElement("td");
    tdL.textContent = label;
    tr.appendChild(tdL);
    STATE.sheets.forEach(s=>{
      const td = document.createElement("td");
      td.textContent = getter(s);
      tr.appendChild(td);
    });
    tfoot.appendChild(tr);
  });

  table.appendChild(tbody);
  table.appendChild(tfoot);

  els.tableWrapper.innerHTML = "";
  els.tableWrapper.appendChild(table);
}

// Import/Export (simple JSON)
function exportGame(){
  const data = {
    players: STATE.players,
    currentPlayer: STATE.currentPlayer,
    dice: STATE.dice,
    held: STATE.held,
    rollsLeft: STATE.rollsLeft,
    sheets: STATE.sheets.map(s=>({
      scores: Array.from(s.scores.entries()),
      locked: Array.from(s.locked.values()),
      upperTotal: s.upperTotal, lowerTotal: s.lowerTotal, bonus: s.bonus, grandTotal: s.grandTotal
    })),
    started: STATE.started
  };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "yahtzee-save.json";
  a.click();
}

function importGame(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const obj = JSON.parse(reader.result);
      STATE.players = obj.players || [];
      STATE.currentPlayer = obj.currentPlayer || 0;
      STATE.dice = obj.dice || [1,1,1,1,1];
      STATE.held = obj.held || [false,false,false,false,false];
      STATE.rollsLeft = obj.rollsLeft ?? 3;
      STATE.sheets = (obj.sheets||[]).map(s=>({
        scores: new Map(s.scores || []),
        locked: new Set(s.locked || []),
        upperTotal: s.upperTotal||0,
        lowerTotal: s.lowerTotal||0,
        bonus: s.bonus||0,
        grandTotal: s.grandTotal||0
      }));
      STATE.started = !!obj.started;
      renderDice();
      renderScoreTable();
      updateTurnInfo();
      alert("Game imported.");
    }catch(e){
      alert("Invalid file.");
    }
  };
  reader.readAsText(file);
}

// Events
els.startBtn.addEventListener("click", startGame);
els.resetBtn.addEventListener("click", resetGame);
els.rollBtn.addEventListener("click", rollDice);
els.endTurnBtn.addEventListener("click", nextPlayer);
els.exportStateBtn.addEventListener("click", exportGame);
els.importStateBtn.addEventListener("click", ()=> els.importFile.click());
els.importFile.addEventListener("change", (e)=>{
  const f = e.target.files[0];
  if (f) importGame(f);
});

// Initial render
renderDice();
updateTurnInfo();
