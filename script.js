document.addEventListener("DOMContentLoaded", init);

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_NAMES = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes'
};

let appConfig = {
  dailyCapacity: 52,
  teams: [],
  weekSchedule: {
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: []
  }
};

function init() {
  loadFromStorage();
  updateCurrentDate();
  redistributeTeams();
  renderTeamsList();
  updateStats();

  document.getElementById('equipoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    addTeam();
  });

  setInterval(updateCurrentDate, 60000);
}

function updateCurrentDate() {
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = today.toLocaleDateString('es-ES', options);
}

function updateDailyCapacity(value) {
  appConfig.dailyCapacity = parseInt(value) || 52;
  saveToStorage();
  redistributeTeams();
  updateStats();
}

function addTeam() {
  const name = document.getElementById('teamName').value.trim();
  const size = parseInt(document.getElementById('teamSize').value);

  if (!name || size <= 0 || size > appConfig.dailyCapacity) {
    alert('⚠️ Verifica el nombre y el tamaño del equipo.');
    return;
  }

  const team = {
    id: Date.now(),
    name,
    size,
    daysPerWeek: Math.random() < 0.5 ? 2 : 3,
    assignedDays: []
  };

  appConfig.teams.push(team);
  saveToStorage();
  redistributeTeams();
  renderTeamsList();
  updateStats();

  document.getElementById('equipoForm').reset();
  showNotification('✅ Equipo agregado exitosamente', 'success');
}

function deleteTeam(id) {
  if (confirm('¿Eliminar este equipo?')) {
    appConfig.teams = appConfig.teams.filter(t => t.id !== id);
    saveToStorage();
    redistributeTeams();
    renderTeamsList();
    updateStats();
    showNotification('🗑️ Equipo eliminado', 'info');
  }
}

function editTeam(id) {
  document.querySelector(`#edit-form-${id}`).classList.toggle('active');
  document.querySelector(`#team-card-${id}`).classList.toggle('editing');
}

function saveTeamEdit(id) {
  const team = appConfig.teams.find(t => t.id === id);
  if (!team) return;

  const newName = document.getElementById(`edit-name-${id}`).value.trim();
  const newSize = parseInt(document.getElementById(`edit-size-${id}`).value);
  const newDays = parseInt(document.getElementById(`edit-days-${id}`).value);

  if (!newName || newSize <= 0 || newSize > appConfig.dailyCapacity || newDays < 1 || newDays > 5) {
    alert('⚠️ Datos inválidos');
    return;
  }

  team.name = newName;
  team.size = newSize;
  team.daysPerWeek = newDays;

  saveToStorage();
  redistributeTeams();
  renderTeamsList();
  updateStats();
  showNotification('✏️ Equipo actualizado', 'success');
}

function redistributeTeams() {
  const weekSchedule = document.getElementById('weekSchedule');
  weekSchedule.classList.add('loading');

  setTimeout(() => {
    DAYS.forEach(day => appConfig.weekSchedule[day] = []);
    appConfig.teams.forEach(team => {
      team.assignedDays = [];
      const shuffled = [...DAYS].sort(() => Math.random() - 0.5);
      let count = 0;
      for (let day of shuffled) {
        const total = appConfig.weekSchedule[day].reduce((sum, t) => sum + t.size, 0);
        if (total + team.size <= appConfig.dailyCapacity) {
          appConfig.weekSchedule[day].push(team);
          team.assignedDays.push(day);
          count++;
          if (count >= team.daysPerWeek) break;
        }
      }
    });

    saveToStorage();
    renderWeekSchedule();
    renderTeamsList();
    updateStats();
    weekSchedule.classList.remove('loading');
    showNotification('🔄 Equipos reorganizados', 'success');
  }, 500);
}

function renderTeamsList() {
  const container = document.getElementById('teamsList');
  container.innerHTML = appConfig.teams.length === 0
    ? '<p style="text-align:center;">📝 No hay equipos registrados</p>'
    : appConfig.teams.map(team => `
      <div class="team-card" id="team-card-${team.id}">
        <div class="team-header">
          <div class="team-info">
            <div class="team-name">👥 ${team.name}</div>
            <div class="team-details">
              ${team.size} personas • ${team.daysPerWeek} días<br>
              📅 ${team.assignedDays.map(d => DAY_NAMES[d]).join(', ') || 'Sin asignar'}
            </div>
          </div>
          <div class="team-actions">
            <button class="btn btn-edit" onclick="editTeam(${team.id})">✏️ Editar</button>
            <button class="btn btn-delete" onclick="deleteTeam(${team.id})">🗑️ Eliminar</button>
          </div>
        </div>
        <div class="edit-form" id="edit-form-${team.id}">
          <input type="text" id="edit-name-${team.id}" value="${team.name}" class="inline-input">
          <input type="number" id="edit-size-${team.id}" value="${team.size}" min="1" max="${appConfig.dailyCapacity}" class="inline-input">
          <input type="number" id="edit-days-${team.id}" value="${team.daysPerWeek}" min="1" max="5" class="inline-input">
          <button class="btn btn-save" onclick="saveTeamEdit(${team.id})">💾 Guardar</button>
        </div>
      </div>
    `).join('');
}

function renderWeekSchedule() {
  const container = document.getElementById('weekSchedule');
  container.innerHTML = '';

  DAYS.forEach(day => {
    const total = appConfig.weekSchedule[day].reduce((sum, t) => sum + t.size, 0);
    const percent = Math.round((total / appConfig.dailyCapacity) * 100);
    const colorClass = percent > 90 ? 'danger' : percent > 70 ? 'warning' : 'success';

    container.innerHTML += `
      <div class="day-column">
        <div class="day-header">${DAY_NAMES[day]}</div>
        <div class="day-content">
          ${appConfig.weekSchedule[day].length === 0
            ? '<p style="text-align:center;color:#999">Sin equipos</p>'
            : appConfig.weekSchedule[day].map(t => `<div class="team-in-day">👥 ${t.name} (${t.size})</div>`).join('')}
        </div>
        <div class="day-counter ${colorClass}">${total}/${appConfig.dailyCapacity} (${percent}%)</div>
      </div>
    `;
  });
}

function updateStats() {
  document.getElementById('totalTeams').textContent = appConfig.teams.length;
  document.getElementById('totalPeople').textContent = appConfig.teams.reduce((sum, t) => sum + t.size, 0);

  const todayIndex = new Date().getDay();
  const dayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][todayIndex];
  const todayTotal = appConfig.weekSchedule[dayKey]?.reduce((sum, t) => sum + t.size, 0) || 0;
  document.getElementById('todayOccupancy').textContent = todayTotal;
  document.getElementById('dailyCapacity').textContent = appConfig.dailyCapacity;
}

function saveToStorage() {
  localStorage.setItem('flyrAppData', JSON.stringify(appConfig));
}

function loadFromStorage() {
  const data = localStorage.getItem('flyrAppData');
  if (data) {
    appConfig = JSON.parse(data);
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' :
                  type === 'danger' ? '#ef4444' :
                  '#3b82f6'};
    color: white;
    padding: 15px 25px;
    border-radius: 12px;
    z-index: 1000;
    font-weight: 600;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.style.transform = 'translateX(0)', 100);
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}


