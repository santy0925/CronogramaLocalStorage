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

let currentTeamIdForMembers = null; // Para saber qué equipo estamos editando en el modal de miembros

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

  // Listener para cerrar el modal al hacer clic fuera del contenido
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('membersModal');
    if (event.target == modal) {
      closeMembersModal();
    }
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
    assignedDays: [],
    members: [] // Nuevo: Propiedad para los integrantes del equipo
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
  // Esta función ahora solo abre/cierra el formulario de edición básico del equipo
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
      <div class="team-card" id="team-card-${team.id}" onclick="openMembersModal(${team.id})"> <div class="team-header">
          <div class="team-info">
            <div class="team-name">👥 ${team.name}</div>
            <div class="team-details">
              ${team.size} personas • ${team.daysPerWeek} días<br>
              📅 ${team.assignedDays.map(d => DAY_NAMES[d]).join(', ') || 'Sin asignar'}
              <br>
              Miembros: ${team.members.length} / ${team.size} </div>
          </div>
          <div class="team-actions">
            <button class="btn btn-edit" onclick="event.stopPropagation(); editTeam(${team.id});">✏️ Editar</button>
            <button class="btn btn-delete" onclick="event.stopPropagation(); deleteTeam(${team.id});">🗑️ Eliminar</button>
          </div>
        </div>
        <div class="edit-form" id="edit-form-${team.id}" onclick="event.stopPropagation();">
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
  // Suma total de personas incluyendo las de todos los equipos
  document.getElementById('totalPeople').textContent = appConfig.teams.reduce((sum, t) => sum + t.size, 0);

  const todayIndex = new Date().getDay();
  // Ajuste para mapear Sunday (0) a Saturday (6) a las claves de DAYS.
  // Si es domingo (0) o sábado (6), no hay asignación de equipo en el cronograma.
  const dayKey = (todayIndex === 0 || todayIndex === 6) ? null : DAYS[todayIndex - 1]; // Lunes es 1, Viernes es 5

  const todayTotal = dayKey ? appConfig.weekSchedule[dayKey]?.reduce((sum, t) => sum + t.size, 0) || 0 : 0;
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
    // Asegurar que la propiedad 'members' existe en equipos antiguos al cargar
    appConfig.teams.forEach(team => {
      if (!team.members) {
        team.members = [];
      }
    });
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

// --- Funciones del Modal de Integrantes ---

function openMembersModal(teamId) {
  const team = appConfig.teams.find(t => t.id === teamId);
  if (!team) return;

  currentTeamIdForMembers = teamId;
  document.getElementById('modalTeamName').textContent = `Integrantes de "${team.name}"`;
  renderMembersList(team.members);
  document.getElementById('membersModal').classList.add('show-modal');
}

function closeMembersModal() {
  document.getElementById('membersModal').classList.remove('show-modal');
  currentTeamIdForMembers = null; // Reiniciar el ID del equipo actual
  // Volver a renderizar la lista de equipos para actualizar el contador de miembros
  renderTeamsList();
}

function renderMembersList(members) {
  const memberListDiv = document.getElementById('memberList');
  memberListDiv.innerHTML = members.length === 0
    ? '<p style="text-align:center;color:#999;">No hay integrantes en este equipo.</p>'
    : members.map(member => `
      <div class="member-item" id="member-item-${member.id}">
        <span class="member-name" id="member-name-display-${member.id}">${member.name}</span>
        <input type="text" id="member-name-edit-${member.id}" value="${member.name}" class="member-input" style="display:none;">
        <div class="member-actions">
          <button class="btn btn-edit" onclick="toggleMemberEdit(${member.id})">✏️ Editar</button>
          <button class="btn btn-save" id="save-member-btn-${member.id}" onclick="saveMemberEdit(${member.id})" style="display:none;">💾 Guardar</button>
          <button class="btn btn-delete" onclick="deleteMemberFromTeam(${member.id})">🗑️ Eliminar</button>
        </div>
      </div>
    `).join('');
}

function addMemberToTeam() {
  const team = appConfig.teams.find(t => t.id === currentTeamIdForMembers);
  if (!team) return;

  const newMemberNameInput = document.getElementById('newMemberName');
  const name = newMemberNameInput.value.trim();

  if (!name) {
    alert('⚠️ Ingresa un nombre para el integrante.');
    return;
  }
  if (team.members.length >= team.size) {
    alert(`⚠️ El equipo ya tiene el número máximo de integrantes (${team.size}).`);
    return;
  }

  const newMember = {
    id: Date.now(),
    name: name
  };

  team.members.push(newMember);
  saveToStorage();
  renderMembersList(team.members);
  newMemberNameInput.value = ''; // Limpiar el campo
  showNotification('✅ Integrante agregado', 'success');
  updateStats(); // Actualizar el conteo de personas si 'totalPeople' considera miembros.
  renderTeamsList(); // Para actualizar el conteo de miembros en la tarjeta del equipo.
}

function deleteMemberFromTeam(memberId) {
  const team = appConfig.teams.find(t => t.id === currentTeamIdForMembers);
  if (!team) return;

  if (confirm('¿Eliminar a este integrante?')) {
    team.members = team.members.filter(m => m.id !== memberId);
    saveToStorage();
    renderMembersList(team.members);
    showNotification('🗑️ Integrante eliminado', 'info');
    updateStats();
    renderTeamsList();
  }
}

function toggleMemberEdit(memberId) {
  const displaySpan = document.getElementById(`member-name-display-${memberId}`);
  const editInput = document.getElementById(`member-name-edit-${memberId}`);
  const editButton = document.querySelector(`#member-item-${memberId} .btn-edit`);
  const saveButton = document.getElementById(`save-member-btn-${memberId}`);

  if (displaySpan.style.display === 'none') {
    // Modo visualización
    displaySpan.style.display = 'inline-block';
    editInput.style.display = 'none';
    editButton.textContent = '✏️ Editar';
    saveButton.style.display = 'none';
  } else {
    // Modo edición
    displaySpan.style.display = 'none';
    editInput.style.display = 'inline-block';
    editInput.focus();
    editButton.textContent = '❌ Cancelar'; // Cambiar a cancelar si estás en modo edición
    saveButton.style.display = 'inline-block';
  }
}

function saveMemberEdit(memberId) {
  const team = appConfig.teams.find(t => t.id === currentTeamIdForMembers);
  if (!team) return;

  const member = team.members.find(m => m.id === memberId);
  if (!member) return;

  const newName = document.getElementById(`member-name-edit-${memberId}`).value.trim();

  if (!newName) {
    alert('⚠️ El nombre del integrante no puede estar vacío.');
    return;
  }

  member.name = newName;
  saveToStorage();
  renderMembersList(team.members); // Vuelve a renderizar la lista para mostrar el cambio
  showNotification('✏️ Integrante actualizado', 'success');
}

function saveMembersChanges() {
  // Esta función es más bien para confirmar que los cambios en el modal se persisten,
  // aunque ya se están guardando con cada add/edit/delete individual.
  // Podría usarse para una lógica de "Guardar todo al cerrar" si se prefiere.
  saveToStorage(); // Asegurar que todo esté guardado
  showNotification('💾 Cambios de integrantes guardados', 'success');
  closeMembersModal();
}