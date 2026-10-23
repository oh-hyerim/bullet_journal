/**
 * Lovely Pink Diary - Bullet Journal Logic
 * Updated:
 * 1. Habit Weekly Streak: Deleted days are filled with light gray (deleted-cell) instead of disappearing.
 * 2. Habit Monthly Mode: Supports toggle between Weekly and Monthly. Monthly view shows 1 habit calendar at a time with select dropdown.
 * 3. Google Auth: Single icon button toggle. Shows G when logged out, Pink User Icon when logged in. Auto-persists session in localStorage.
 * 4. Migration (>): Guaranteed next-day migration both when creating directly with (>) or changing status to (>).
 */

// ==========================================
// 1. 상태 관리 & 심볼 정의
// ==========================================
const SYMBOLS = {
  task: { char: '•', label: '할 일' },
  done: { char: '✕', label: '완료' },
  migrated: { char: '>', label: '연기 (내일로)' },
  event: { char: '○', label: '이벤트' },
  note: { char: '―', label: '메모' }
};

let currentDate = new Date();
// 3. 구글 로그인 영구 유지 (수동 로그아웃 전까지 유지)
let currentUser = loadAuthUser();
let isTimeMorePopoverOpen = false;
let justClosedPopover = false;

// 2. 해빗 스트릭 뷰 모드 ('weekly' | 'monthly')
let habitViewMode = 'weekly';
let selectedMonthlyHabitId = null;

let appData = loadLocalData();

function loadAuthUser() {
  const saved = localStorage.getItem('bujoflow_auth_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }
  return null;
}

function loadLocalData() {
  const saved = localStorage.getItem('bujoflow_pink_data');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse local data', e);
    }
  }
  const todayKey = formatDateKey(new Date());
  return {
    todos: [
      { id: '1', date: todayKey, symbol: 'task', text: '예쁜 핑크 다이어리 꾸미기', startTime: '09:00', endTime: '10:00' },
      { id: '2', date: todayKey, symbol: 'task', text: '오후 티타임 및 산책', startTime: '15:00', endTime: '16:00' },
      { id: '3', date: todayKey, symbol: 'note', text: '연기(>)를 선택하면 내일의 할 일(•)로 자동 이관돼요 ✨', startTime: null, endTime: null }
    ],
    habits: [
      { id: 'h1', name: '아침 기상 후 따뜻한 물', icon: '💧', startDate: todayKey, deletedDate: null },
      { id: 'h2', name: '비타민/영양제 챙겨먹기', icon: '💊', startDate: todayKey, deletedDate: null },
      { id: 'h3', name: '오늘 하루 감사한 일 3가지', icon: '🎀', startDate: todayKey, deletedDate: null }
    ],
    habitLogs: {}
  };
}

function saveData() {
  localStorage.setItem('bujoflow_pink_data', JSON.stringify(appData));
}

// ==========================================
// 2. 날짜 유틸리티
// ==========================================
function formatDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(d) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// 4. 안전한 다음 날 날짜 계산
function getNextDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const nextD = new Date(y, m - 1, d + 1);
  return formatDateKey(nextD);
}

// ==========================================
// 3. UI 렌더링 & 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initDateHeader();
  initDatePicker();
  initTheme();
  initMobileNav();
  initSymbolPicker();
  initHabitModal();
  initQuickTimeModal();
  initTimetable();
  initHabitViewToggle();
  initAuthUI();
  renderAll();

  setInterval(updateNowIndicator, 60000);
  setInterval(updateHeaderClock, 1000);

  document.addEventListener('click', (e) => {
    document.querySelectorAll('.todo-item-dropdown').forEach(d => d.remove());

    const openPopovers = document.querySelectorAll('.time-more-popover');
    if (openPopovers.length > 0 && !e.target.closest('.time-more-btn') && !e.target.closest('.time-more-popover')) {
      openPopovers.forEach(p => p.remove());
      isTimeMorePopoverOpen = false;
      justClosedPopover = true;
      setTimeout(() => { justClosedPopover = false; }, 80);
    }
  });
});

function renderAll() {
  const dateKey = formatDateKey(currentDate);
  document.getElementById('currentDateDisplay').textContent = `${formatDateDisplay(currentDate)} 📅`;
  document.getElementById('hiddenDatePicker').value = dateKey;

  renderTodos(dateKey);
  renderTimetable(dateKey);
  renderHabits(dateKey);
  renderStreakView();
}

// --- 불렛 To-Do 렌더링 ---
function renderTodos(dateKey) {
  const listEl = document.getElementById('todoList');
  const emptyEl = document.getElementById('emptyTodoState');
  const countMeta = document.getElementById('todoCountMeta');
  listEl.innerHTML = '';

  const dayTodos = appData.todos.filter(t => t.date === dateKey);
  countMeta.textContent = `${dayTodos.length}건`;

  if (dayTodos.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  dayTodos.forEach(item => {
    const li = document.createElement('li');
    li.className = `todo-item ${item.symbol}`;
    
    const symInfo = SYMBOLS[item.symbol] || SYMBOLS.task;
    const timeLabel = item.startTime && item.endTime ? `${item.startTime}-${item.endTime}` : '';

    li.innerHTML = `
      <div class="todo-item-symbol-wrap">
        <button class="todo-symbol-badge" title="상태 목록 선택">${symInfo.char}</button>
      </div>
      <div class="todo-text-wrap">
        <span class="todo-title" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</span>
        ${timeLabel ? `<span class="todo-time-badge">${timeLabel}</span>` : ''}
      </div>
      <button class="todo-delete-btn" title="삭제">✕</button>
    `;

    // 기호 배지 클릭 시 '상태 변경 리스트 팝오버' 표시
    const badgeWrap = li.querySelector('.todo-item-symbol-wrap');
    const badgeBtn = li.querySelector('.todo-symbol-badge');
    
    badgeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.todo-item-dropdown').forEach(d => d.remove());

      const dropdown = document.createElement('div');
      dropdown.className = 'todo-item-dropdown';

      Object.entries(SYMBOLS).forEach(([symKey, symData]) => {
        const optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.innerHTML = `<span>${symData.char}</span> ${symData.label}`;
        
        optBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          changeTodoStatus(item, symKey);
          dropdown.remove();
        });

        dropdown.appendChild(optBtn);
      });

      badgeWrap.appendChild(dropdown);
    });

    li.querySelector('.todo-delete-btn').addEventListener('click', () => {
      appData.todos = appData.todos.filter(t => t.id !== item.id);
      saveData();
      renderAll();
      showToast('불렛 항목이 삭제되었습니다.');
    });

    listEl.appendChild(li);
  });
}

// 4. 상태 변경 시 연기(>) 선택되면 내일로 자동 기록
function changeTodoStatus(item, newSymbol) {
  item.symbol = newSymbol;

  if (newSymbol === 'migrated') {
    migrateTaskToNextDay(item);
  }

  saveData();
  renderAll();
  showToast(`상태: ${SYMBOLS[newSymbol].label}`);
}

// 4. 연기된 할 일 다음날로 자동 복사 (안전 보장 로직)
function migrateTaskToNextDay(sourceItem) {
  const nextDateKey = getNextDateKey(sourceItem.date);

  const alreadyExists = appData.todos.some(t => t.date === nextDateKey && t.text === sourceItem.text);
  if (!alreadyExists) {
    const migratedTodo = {
      id: 'mig_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      date: nextDateKey,
      symbol: 'task', // 다음날에는 기본 '할 일(•)'로 등록
      text: sourceItem.text,
      startTime: null,
      endTime: null
    };
    appData.todos.push(migratedTodo);
    saveData();
  }

  showToast(`내일(${nextDateKey})의 할 일(•)로 자동 등록되었습니다! 🌸`);
}

// --- 24시간 타임테이블 렌더링 ---
function initTimetable() {
  const grid = document.getElementById('timetableGrid');
  grid.innerHTML = '';

  for (let i = 0; i < 24; i++) {
    const hourStr = String(i).padStart(2, '0') + ':00';
    const row = document.createElement('div');
    row.className = 'time-row';
    row.dataset.hour = i;
    row.title = `${hourStr} 클릭하여 일정 등록`;
    row.innerHTML = `
      <div class="time-label" id="timeLabel_${i}">${hourStr}</div>
      <div class="time-block-area" id="timeArea_${i}"></div>
    `;

    row.addEventListener('click', (e) => {
      if (justClosedPopover || isTimeMorePopoverOpen) return;
      if (e.target.closest('.time-more-btn') || e.target.closest('.time-more-popover')) return;

      openQuickTimeModal(i);
    });

    grid.appendChild(row);
  }
}

function renderTimetable(dateKey) {
  for (let i = 0; i < 24; i++) {
    const area = document.getElementById(`timeArea_${i}`);
    if (area) area.innerHTML = '';
  }

  const dayTodosWithTime = appData.todos.filter(t => t.date === dateKey && t.startTime && t.endTime);
  
  const hourGroups = {};
  dayTodosWithTime.forEach(todo => {
    const startH = parseInt(todo.startTime.split(':')[0], 10);
    if (!hourGroups[startH]) {
      hourGroups[startH] = [];
    }
    hourGroups[startH].push(todo);
  });

  Object.keys(hourGroups).forEach(hourStr => {
    const hour = parseInt(hourStr, 10);
    const todosInHour = hourGroups[hour];
    const targetArea = document.getElementById(`timeArea_${hour}`);
    if (!targetArea) return;

    const multiWrap = document.createElement('div');
    multiWrap.className = 'time-block-multi-wrap';

    const maxVisible = 3;
    const visibleTodos = todosInHour.slice(0, maxVisible);
    const hiddenCount = todosInHour.length - maxVisible;

    visibleTodos.forEach(todo => {
      const miniBlock = document.createElement('div');
      miniBlock.className = 'time-mini-block';
      miniBlock.title = `${todo.startTime}~${todo.endTime}: ${todo.text}`;
      miniBlock.textContent = `${SYMBOLS[todo.symbol]?.char || '•'} ${todo.text}`;
      multiWrap.appendChild(miniBlock);
    });

    if (hiddenCount > 0) {
      const moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'time-more-btn';
      moreBtn.innerHTML = `▼ +${hiddenCount}`;
      moreBtn.title = `총 ${todosInHour.length}개 일정 전체보기`;

      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.time-more-popover').forEach(p => p.remove());

        const popover = document.createElement('div');
        popover.className = 'time-more-popover';

        const popHeader = document.createElement('div');
        popHeader.className = 'time-more-popover-header';
        popHeader.innerHTML = `
          <span class="time-more-popover-title">${hour}:00 전체 일정 (${todosInHour.length}건)</span>
          <button type="button" class="time-more-close-btn" title="닫기">✕</button>
        `;
        popHeader.querySelector('.time-more-close-btn').addEventListener('click', (ev) => {
          ev.stopPropagation();
          popover.remove();
          isTimeMorePopoverOpen = false;
        });

        popover.appendChild(popHeader);

        todosInHour.forEach(t => {
          const item = document.createElement('div');
          item.className = 'time-more-item';
          item.innerHTML = `<strong>${SYMBOLS[t.symbol]?.char || '•'}</strong> [${t.startTime}~${t.endTime}] ${escapeHtml(t.text)}`;
          popover.appendChild(item);
        });

        targetArea.appendChild(popover);
        isTimeMorePopoverOpen = true;
      });

      multiWrap.appendChild(moreBtn);
    }

    targetArea.appendChild(multiWrap);
  });

  updateNowIndicator();
}

function updateNowIndicator() {
  document.querySelectorAll('.current-hour-tag').forEach(el => el.remove());

  const todayKey = formatDateKey(new Date());
  const selectedKey = formatDateKey(currentDate);

  if (todayKey === selectedKey) {
    const now = new Date();
    const curHour = now.getHours();
    const targetLabel = document.getElementById(`timeLabel_${curHour}`);
    if (targetLabel) {
      const tag = document.createElement('div');
      tag.className = 'current-hour-tag';
      tag.textContent = '현재시간';
      targetLabel.appendChild(tag);
    }
  }
}

function updateHeaderClock() {
  const clockEl = document.getElementById('currentClockDisplay');
  if (clockEl) {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

// --- 타임테이블 퀵 등록 모달 ---
function initQuickTimeModal() {
  const modal = document.getElementById('quickTimeModal');
  const closeBtn = document.getElementById('closeQuickTimeBtn');
  const cancelBtn = document.getElementById('cancelQuickTimeBtn');
  const form = document.getElementById('quickTimeForm');

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = document.getElementById('quickTimeText').value.trim();
    const start = document.getElementById('quickTimeStart').value;
    const end = document.getElementById('quickTimeEnd').value;
    if (!text || !start || !end) return;

    const newTodo = {
      id: Date.now().toString(),
      date: formatDateKey(currentDate),
      symbol: 'task',
      text: text,
      startTime: start,
      endTime: end
    };

    appData.todos.push(newTodo);
    saveData();
    modal.classList.add('hidden');
    renderAll();
    showToast(`타임테이블에 할 일(•)이 등록되었습니다. (${start} - ${end})`);
  });
}

function openQuickTimeModal(hour) {
  const modal = document.getElementById('quickTimeModal');
  const title = document.getElementById('quickTimeModalTitle');
  const textInput = document.getElementById('quickTimeText');
  const startInput = document.getElementById('quickTimeStart');
  const endInput = document.getElementById('quickTimeEnd');

  const startH = String(hour).padStart(2, '0') + ':00';
  const endH = String(Math.min(hour + 1, 23)).padStart(2, '0') + ':00';

  title.textContent = `${startH} 일정 바로 등록`;
  textInput.value = '';
  startInput.value = startH;
  endInput.value = endH;

  modal.classList.remove('hidden');
  textInput.focus();
}

// ==========================================
// 5. 해빗트래커 (주간 / 월간 모드 & 회색 삭제 칸)
// ==========================================
function isHabitActiveOnDate(habit, targetDateKey) {
  if (habit.startDate && targetDateKey < habit.startDate) {
    return false;
  }
  if (habit.deletedDate && targetDateKey >= habit.deletedDate) {
    return false;
  }
  return true;
}

function renderHabits(dateKey) {
  const listEl = document.getElementById('habitList');
  listEl.innerHTML = '';

  const completedToday = appData.habitLogs[dateKey] || [];
  const visibleHabits = appData.habits.filter(habit => isHabitActiveOnDate(habit, dateKey));

  if (visibleHabits.length === 0) {
    listEl.innerHTML = '<li class="empty-state" style="padding:15px;"><small>등록된 습관이 없습니다. + 등록을 눌러보세요.</small></li>';
    return;
  }

  visibleHabits.forEach(habit => {
    const isDone = completedToday.includes(habit.id);
    const li = document.createElement('li');
    li.className = 'habit-item';
    li.innerHTML = `
      <div class="habit-info">
        <span class="habit-emoji">${habit.icon}</span>
        <span class="habit-name" title="${escapeHtml(habit.name)}">${escapeHtml(habit.name)}</span>
      </div>
      <div class="habit-actions-wrap">
        <button class="habit-check-btn ${isDone ? 'completed' : ''}" title="달성 체크">
          ${isDone ? '✓' : ''}
        </button>
        <button class="habit-del-btn" title="오늘부터 삭제">✕</button>
      </div>
    `;

    li.querySelector('.habit-check-btn').addEventListener('click', () => {
      toggleHabit(habit.id, dateKey);
    });

    // ✕ 버튼: 해당 날짜 이후만 삭제 (기존 기능)
    li.querySelector('.habit-del-btn').addEventListener('click', () => {
      if (confirm(`'${habit.name}' 습관을 오늘(${dateKey})부터 삭제하시겠습니까?\n\n- ${dateKey}부터는 삭제되어 회색으로 표시됩니다.\n- 이전 날짜의 달성 기록은 안전하게 보존됩니다.`)) {
        habit.deletedDate = dateKey;
        saveData();
        renderHabits(dateKey);
        renderStreakView();
        showToast(`${dateKey}부터 해당 습관이 삭제되었습니다.`);
      }
    });

    // 길게 누르기: 습관 전체(이전/이후 모두) 완전 삭제
    let longPressTimer = null;
    const startLongPress = () => {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        if (confirm(`⚠️ '${habit.name}' 습관을 완전히 삭제하시겠습니까?\n\n이전 날짜의 달성 기록까지 모두 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`)) {
          // 습관 자체 제거
          appData.habits = appData.habits.filter(h => h.id !== habit.id);
          // 모든 날짜의 로그에서 해당 habitId 제거
          Object.keys(appData.habitLogs).forEach(dk => {
            appData.habitLogs[dk] = appData.habitLogs[dk].filter(id => id !== habit.id);
          });
          saveData();
          renderHabits(dateKey);
          renderStreakView();
          showToast(`'${habit.name}' 습관이 완전히 삭제되었습니다.`);
        }
      }, 700);
    };
    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const habitInfoEl = li.querySelector('.habit-info');
    habitInfoEl.addEventListener('mousedown', startLongPress);
    habitInfoEl.addEventListener('mouseup', cancelLongPress);
    habitInfoEl.addEventListener('mouseleave', cancelLongPress);
    habitInfoEl.addEventListener('touchstart', startLongPress, { passive: true });
    habitInfoEl.addEventListener('touchend', cancelLongPress);
    habitInfoEl.addEventListener('touchcancel', cancelLongPress);
    habitInfoEl.style.cursor = 'pointer';
    habitInfoEl.title = '길게 누르면 습관 전체 삭제';

    listEl.appendChild(li);
  });
}

function toggleHabit(habitId, dateKey) {
  if (!appData.habitLogs[dateKey]) {
    appData.habitLogs[dateKey] = [];
  }
  const idx = appData.habitLogs[dateKey].indexOf(habitId);
  if (idx > -1) {
    appData.habitLogs[dateKey].splice(idx, 1);
  } else {
    appData.habitLogs[dateKey].push(habitId);
    showToast('습관 달성 완료! 🌸');
  }
  saveData();
  renderHabits(dateKey);
  renderStreakView();
}

// 2. 주간 / 월간 뷰 토글
function initHabitViewToggle() {
  const weeklyBtn = document.getElementById('viewWeeklyBtn');
  const monthlyBtn = document.getElementById('viewMonthlyBtn');
  const weeklyContainer = document.getElementById('weeklyStreakContainer');
  const monthlyContainer = document.getElementById('monthlyStreakContainer');
  const selectEl = document.getElementById('monthlyHabitSelect');

  weeklyBtn.addEventListener('click', () => {
    habitViewMode = 'weekly';
    weeklyBtn.classList.add('active');
    monthlyBtn.classList.remove('active');
    weeklyContainer.classList.remove('hidden');
    monthlyContainer.classList.add('hidden');
    renderStreakView();
  });

  monthlyBtn.addEventListener('click', () => {
    habitViewMode = 'monthly';
    monthlyBtn.classList.add('active');
    weeklyBtn.classList.remove('active');
    monthlyContainer.classList.remove('hidden');
    weeklyContainer.classList.add('hidden');
    renderStreakView();
  });

  selectEl.addEventListener('change', (e) => {
    selectedMonthlyHabitId = e.target.value;
    renderMonthlyStreak();
  });
}

function renderStreakView() {
  if (habitViewMode === 'weekly') {
    renderWeeklyStreak();
  } else {
    renderMonthlyStreak();
  }
}

// 1. 주간 스트릭: 현재 보고 있는 날짜(currentDateKey)에 유효한 습관만 행으로 생성
// (23일 삭제 시 22일까지는 주간 스트릭에 표시, 23일부터는 습관 행 자체가 완전 삭제)
// (11월 1일 생성 시 11월 1일부터 스트릭 생성, 10월 31일까지는 스트릭 행 전혀 생성 안 함)
function renderWeeklyStreak() {
  const grid = document.getElementById('habitStreakGrid');
  grid.innerHTML = '';

  const currentDateKey = formatDateKey(currentDate);

  // 의장님 지침: 현재 보고 있는 날짜(currentDateKey)에 살아있는 습관만 주간 스트릭 행으로 렌더링!
  const activeHabits = appData.habits.filter(h => isHabitActiveOnDate(h, currentDateKey));

  if (activeHabits.length === 0) {
    grid.innerHTML = '<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:10px;">기록된 습관이 없습니다.</div>';
    return;
  }

  const sunday = new Date(currentDate);
  sunday.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    weekDates.push(formatDateKey(d));
  }

  activeHabits.forEach(habit => {
    const row = document.createElement('div');
    row.className = 'streak-row';

    const title = document.createElement('span');
    title.className = 'streak-habit-title';
    title.textContent = `${habit.icon} ${habit.name}`;
    title.title = habit.name;
    row.appendChild(title);

    weekDates.forEach((dKey, dayIdx) => {
      const cell = document.createElement('div');
      const isTodayCell = (dKey === currentDateKey);

      // 삭제된 날짜 당일이거나 이후라면 -> 연한 회색 칸(deleted-cell)으로 채움!
      if (habit.deletedDate && dKey >= habit.deletedDate) {
        cell.className = 'streak-cell deleted-cell';
        cell.title = `${dKey}: 삭제됨`;
        cell.textContent = '';
      } else if (habit.startDate && dKey < habit.startDate) {
        cell.className = 'streak-cell';
        cell.title = `${dKey}: 생성 전`;
        cell.textContent = '';
      } else {
        const isDone = (appData.habitLogs[dKey] || []).includes(habit.id);
        cell.className = `streak-cell ${isDone ? 'done' : ''}`;
        cell.title = `${dKey} (${['일','월','화','수','목','금','토'][dayIdx]}): ${isDone ? '달성' : '미달성'}`;
        cell.textContent = isDone ? '✓' : '';
      }

      if (isTodayCell && !(habit.deletedDate && dKey >= habit.deletedDate)) {
        cell.style.borderColor = 'var(--accent-pink)';
        cell.style.borderWidth = '2px';
      }

      row.appendChild(cell);
    });

    grid.appendChild(row);
  });
}

// 2. 월간 스트릭: 현재 보고 있는 날짜(currentDateKey)에 유효한 습관만 선택 드롭다운에 노출!
// (23일 삭제 시 22일까지는 습관 선택에 나옴, 23일부터는 습관 선택에서도 완전히 삭제)
// (11월 1일 생성 시 11월 1일부터 습관 선택에 나옴, 10월 31일까지는 습관 선택에 일절 안 나옴)
function renderMonthlyStreak() {
  const selectEl = document.getElementById('monthlyHabitSelect');
  const calGrid = document.getElementById('monthlyCalendarGrid');
  calGrid.innerHTML = '';

  const currentDateKey = formatDateKey(currentDate);

  // 현재 날짜 기준 유효한 습관들만 필터링!
  const availableHabits = appData.habits.filter(h => isHabitActiveOnDate(h, currentDateKey));

  selectEl.innerHTML = '';
  if (availableHabits.length === 0) {
    selectEl.innerHTML = '<option value="">(표시할 습관 없음)</option>';
    calGrid.innerHTML = '<div style="grid-column: span 7; text-align:center; font-size:11px; padding:15px; color:var(--text-muted);">현재 날짜에 유효한 습관이 없습니다.</div>';
    return;
  }

  availableHabits.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.id;
    opt.textContent = `${h.icon} ${h.name}`;
    if (h.id === selectedMonthlyHabitId) opt.selected = true;
    selectEl.appendChild(opt);
  });

  // 현재 선택된 습관이 유효 목록에 없으면 첫 번째 유효 습관으로 자동 재설정
  if (!selectedMonthlyHabitId || !availableHabits.some(h => h.id === selectedMonthlyHabitId)) {
    selectedMonthlyHabitId = availableHabits[0].id;
    selectEl.value = selectedMonthlyHabitId;
  }

  const habit = availableHabits.find(h => h.id === selectedMonthlyHabitId);
  if (!habit) return;

  // 현재 조회 중인 월(Month) 달력 생성
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-based
  const todayKey = formatDateKey(new Date());

  const firstDay = new Date(year, month, 1).getDay(); // 0(일) ~ 6(토)
  const lastDate = new Date(year, month + 1, 0).getDate();

  // 1일 이전 빈 칸
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'month-day-cell empty';
    calGrid.appendChild(emptyCell);
  }

  // 1일부터 말일까지
  for (let day = 1; day <= lastDate; day++) {
    const dKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    const isToday = (dKey === todayKey);

    // 삭제일 이후인지 확인 -> 회색 채움
    if (habit.deletedDate && dKey >= habit.deletedDate) {
      cell.className = 'month-day-cell deleted-cell';
      cell.title = `${dKey}: 삭제됨`;
      cell.innerHTML = `<span class="month-day-num">${day}</span>`;
    } else if (habit.startDate && dKey < habit.startDate) {
      cell.className = 'month-day-cell';
      cell.title = `${dKey}: 생성 전`;
      cell.innerHTML = `<span class="month-day-num">${day}</span>`;
    } else {
      const isDone = (appData.habitLogs[dKey] || []).includes(habit.id);
      cell.className = `month-day-cell ${isDone ? 'done' : ''} ${isToday ? 'today' : ''}`;
      cell.title = `${dKey}: ${isDone ? '달성 완료' : '미달성'}`;
      cell.innerHTML = `
        <span class="month-day-num">${day}</span>
        ${isDone ? '<span class="month-day-check">✓</span>' : ''}
      `;
    }

    calGrid.appendChild(cell);
  }
}

// ==========================================
// 6. 이벤트 핸들러 & 4. 연기 아이콘 처리
// ==========================================
function initDateHeader() {
  document.getElementById('prevDateBtn').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    renderAll();
  });
  document.getElementById('nextDateBtn').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    renderAll();
  });
  document.getElementById('todayBtn').addEventListener('click', () => {
    currentDate = new Date();
    renderAll();
  });

  // 4. 투두 등록 시: 만약 기호가 'migrated(>)'이면 오늘 등록과 동시에 내일의 할 일(•)로 자동 이관!
  document.getElementById('todoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (!text) return;

    const symbolBtn = document.getElementById('symbolPickerBtn');
    const symbol = symbolBtn.dataset.symbol || 'task';

    const timeWrap = document.getElementById('timeInputWrap');
    let startTime = null;
    let endTime = null;
    if (!timeWrap.classList.contains('hidden')) {
      startTime = document.getElementById('startTimeInput').value;
      endTime = document.getElementById('endTimeInput').value;
    }

    const newTodo = {
      id: Date.now().toString(),
      date: formatDateKey(currentDate),
      symbol,
      text,
      startTime,
      endTime
    };

    appData.todos.push(newTodo);

    // 4. 연기 기호(>)로 등록한 경우 내일 할 일(•) 자동 생성
    if (symbol === 'migrated') {
      migrateTaskToNextDay(newTodo);
    }

    saveData();
    input.value = '';
    renderAll();
    showToast('새 불렛 항목이 추가되었습니다.');
  });

  document.getElementById('timeToggleBtn').addEventListener('click', () => {
    document.getElementById('timeInputWrap').classList.toggle('hidden');
  });
}

function initDatePicker() {
  const dateDisplay = document.getElementById('currentDateDisplay');
  const dateInput = document.getElementById('hiddenDatePicker');

  dateDisplay.addEventListener('click', () => {
    if (typeof dateInput.showPicker === 'function') {
      dateInput.showPicker();
    } else {
      dateInput.click();
    }
  });

  dateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split('-').map(Number);
      currentDate = new Date(y, m - 1, d);
      renderAll();
      showToast(`${formatDateKey(currentDate)} 날짜로 이동했습니다.`);
    }
  });
}

function initSymbolPicker() {
  const btn = document.getElementById('symbolPickerBtn');
  const dropdown = document.getElementById('symbolDropdown');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  dropdown.querySelectorAll('.sym-item').forEach(item => {
    item.addEventListener('click', () => {
      const sym = item.dataset.sym;
      btn.dataset.symbol = sym;
      btn.textContent = SYMBOLS[sym].char;
      dropdown.classList.add('hidden');
    });
  });

  document.addEventListener('click', () => {
    dropdown.classList.add('hidden');
  });
}

function initTheme() {
  const btn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('bujoflow_pink_theme') || 'theme-pink';
  document.body.className = savedTheme;
  btn.textContent = savedTheme === 'theme-latte' ? '☕' : '🌸';

  btn.addEventListener('click', () => {
    if (document.body.classList.contains('theme-latte')) {
      document.body.className = 'theme-pink';
      btn.textContent = '🌸';
      localStorage.setItem('bujoflow_pink_theme', 'theme-pink');
      showToast('러블리 핑크 테마 적용');
    } else {
      document.body.className = 'theme-latte';
      btn.textContent = '☕';
      localStorage.setItem('bujoflow_pink_theme', 'theme-latte');
      showToast('라떼 핑크 테마 적용');
    }
  });
}

function initMobileNav() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.dataset.target;
      document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active-panel'));
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active-panel');
      }
    });
  });
}

function initHabitModal() {
  const modal = document.getElementById('habitModal');
  const openBtn = document.getElementById('addHabitModalBtn');
  const closeBtn = document.getElementById('closeHabitModalBtn');
  const cancelBtn = document.getElementById('cancelHabitBtn');
  const form = document.getElementById('newHabitForm');

  let selectedEmoji = '💧';

  openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  document.querySelectorAll('.emoji-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-choice').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = btn.textContent;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('habitNameInput');
    const name = nameInput.value.trim();
    if (!name) return;

    appData.habits.push({
      id: 'h_' + Date.now(),
      name,
      icon: selectedEmoji,
      startDate: formatDateKey(currentDate),
      deletedDate: null
    });
    saveData();
    nameInput.value = '';
    modal.classList.add('hidden');
    renderAll();
    showToast('새 습관이 등록되었습니다.');
  });
}

// ==========================================
// 3. 구글 아이콘 버튼 로그인 & 항상 로그인 유지
// ==========================================
function initAuthUI() {
  const btn = document.getElementById('googleLoginBtn');
  const loggedOutIcon = document.getElementById('googleLoggedOutIcon');
  const loggedInIcon = document.getElementById('googleLoggedInIcon');

  function updateIcon() {
    if (currentUser) {
      loggedOutIcon.classList.add('hidden');
      loggedInIcon.classList.remove('hidden');
      btn.title = `${currentUser.name} 연동됨 (클릭 시 로그아웃)`;
      btn.style.borderColor = 'var(--accent-pink)';
    } else {
      loggedOutIcon.classList.remove('hidden');
      loggedInIcon.classList.add('hidden');
      btn.title = '구글 계정 연동 (클릭)';
      btn.style.borderColor = 'var(--border-color)';
    }
  }

  btn.addEventListener('click', () => {
    if (currentUser) {
      if (confirm('구글 계정을 로그아웃하시겠습니까?')) {
        currentUser = null;
        localStorage.removeItem('bujoflow_auth_user');
        updateIcon();
        showToast('로그아웃되었습니다.');
      }
    } else {
      currentUser = {
        name: '의장님',
        email: 'user@gmail.com'
      };
      localStorage.setItem('bujoflow_auth_user', JSON.stringify(currentUser));
      updateIcon();
      showToast('구글 계정 연동 완료! (로그인 상태가 유지됩니다)');
    }
  });

  updateIcon();
}

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2400);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}
