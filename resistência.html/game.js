// ============================================
// ESTADO DO JOGO
// ============================================
const gameState = {
    players: [],
    numPlayers: 5,
    numSpies: 2,
    useSpecialRoles: false,
    currentPlayerIndex: 0,
    currentMissionVoter: 0,
    currentTeamVoter: 0,
    roles: [],
    specialRoles: {
        commander: -1,
        bodyguard: -1,
        falseCommander: -1
    },
    missionResults: [],
    currentMission: 1,
    currentLeader: 0,
    teamProposal: [],
    teamVotes: [],
    missionVotes: [],
    resistanceScore: 0,
    spyScore: 0,
    failedVotes: 0,
    phase: 'setup'
};

// Histórico de espiões para não repetir
let spyHistory = [];

// Configuração das missões por número de jogadores
const missionConfig = {
    5: { missions: [2, 3, 2, 3, 3], minSpies: 2, maxSpies: 2 },
    6: { missions: [2, 3, 4, 3, 4], minSpies: 2, maxSpies: 2 },
    7: { missions: [2, 3, 3, 4, 4], minSpies: 2, maxSpies: 3 },
    8: { missions: [3, 4, 4, 5, 5], minSpies: 3, maxSpies: 3 },
    9: { missions: [3, 4, 4, 5, 5], minSpies: 3, maxSpies: 4 },
    10: { missions: [3, 4, 4, 5, 5], minSpies: 4, maxSpies: 4 }
};

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    document.getElementById(screenId).style.display = 'block';
}

// ============================================
// CONFIGURAÇÃO INICIAL
// ============================================
function generatePlayerInputs() {
    const container = document.getElementById('player-names');
    container.innerHTML = '';

    for (let i = 0; i < gameState.numPlayers; i++) {
        container.innerHTML += `
            <div class="player-input">
                <label>Jogador ${i + 1}:</label>
                <input type="text" id="player${i}" value="Jogador ${i + 1}" placeholder="Nome do jogador">
            </div>
        `;
    }

    updateSpyCount();
}

function updateSpyCount() {
    const config = missionConfig[gameState.numPlayers];
    const spyInput = document.getElementById('num-spies');
    spyInput.min = config.minSpies;
    spyInput.max = config.maxSpies;
    spyInput.value = config.minSpies;

    document.getElementById('min-spies').textContent = config.minSpies;
    document.getElementById('max-spies').textContent = config.maxSpies;

    toggleSpecialRoles();
}

function toggleSpecialRoles() {
    const specialRolesCheckbox = document.getElementById('use-special-roles');
    const specialRolesConfig = document.getElementById('special-roles-config');

    if (specialRolesCheckbox.checked && gameState.numPlayers >= 7) {
        specialRolesConfig.style.display = 'block';
        gameState.useSpecialRoles = true;
    } else {
        specialRolesConfig.style.display = 'none';
        specialRolesCheckbox.checked = false;
        gameState.useSpecialRoles = false;

        // Desmarcar todos os papéis especiais
        document.getElementById('use-commander').checked = false;
        document.getElementById('use-bodyguard').checked = false;
        document.getElementById('use-false-commander').checked = false;
    }
}

function getActiveSpecialRoles() {
    return {
        commander: document.getElementById('use-commander')?.checked || false,
        bodyguard: document.getElementById('use-bodyguard')?.checked || false,
        falseCommander: document.getElementById('use-false-commander')?.checked || false
    };
}

function toggleRules() {
    const rules = document.getElementById('rules-section');
    const btn = document.getElementById('toggle-rules-btn');
    if (rules.style.display === 'none' || !rules.style.display) {
        rules.style.display = 'block';
        btn.textContent = 'Ocultar Regras 📖';
    } else {
        rules.style.display = 'none';
        btn.textContent = 'Mostrar Regras 📖';
    }
}

// Event Listeners
document.getElementById('player-count').addEventListener('change', function (e) {
    gameState.numPlayers = parseInt(e.target.value);
    generatePlayerInputs();
});

document.getElementById('use-special-roles').addEventListener('change', toggleSpecialRoles);

// ============================================
// INÍCIO DO JOGO E DISTRIBUIÇÃO DE PAPÉIS
// ============================================
function startGame() {
    // Coletar nomes dos jogadores
    gameState.players = [];
    for (let i = 0; i < gameState.numPlayers; i++) {
        const nameInput = document.getElementById(`player${i}`);
        gameState.players.push(nameInput.value || `Jogador ${i + 1}`);
    }

    gameState.numSpies = parseInt(document.getElementById('num-spies').value);
    gameState.useSpecialRoles = document.getElementById('use-special-roles').checked && gameState.numPlayers >= 7;

    // Resetar papéis especiais
    gameState.specialRoles = {
        commander: -1,
        bodyguard: -1,
        falseCommander: -1
    };

    // Distribuir papéis secretos
    assignRoles();

    // Iniciar revelação de papéis
    gameState.currentPlayerIndex = 0;
    showScreen('role-screen');
    revealCurrentRole();
}

function assignRoles() {
    // Criar array de índices disponíveis
    let availablePlayers = [...Array(gameState.numPlayers).keys()];

    // Inicializar todos como Resistência
    gameState.roles = new Array(gameState.numPlayers).fill('Resistência');

    // Pegar últimos espiões do histórico para evitar repetir
    const recentSpies = spyHistory.slice(-Math.floor(gameState.numPlayers / 2));

    // Criar pool de candidatos a espião (evitando os recentes)
    let spyCandidates = availablePlayers.filter(p => !recentSpies.includes(p));

    // Se não tiver candidatos suficientes, usar todos
    if (spyCandidates.length < gameState.numSpies) {
        spyCandidates = [...availablePlayers];
    }

    // Embaralhar candidatos e selecionar espiões
    spyCandidates = shuffle(spyCandidates);
    const selectedSpies = spyCandidates.slice(0, gameState.numSpies);

    // Atribuir papéis de espião
    selectedSpies.forEach(playerIndex => {
        gameState.roles[playerIndex] = 'Espião';
    });

    // Atualizar histórico
    spyHistory = spyHistory.concat(selectedSpies);
    if (spyHistory.length > 20) spyHistory = spyHistory.slice(-20);

    // Distribuir papéis especiais se ativado
    if (gameState.useSpecialRoles) {
        assignSpecialRoles(selectedSpies);
    }
}

function assignSpecialRoles(spies) {
    const activeRoles = getActiveSpecialRoles();

    // Se nenhum papel especial foi selecionado, não faz nada
    if (!activeRoles.commander && !activeRoles.bodyguard && !activeRoles.falseCommander) {
        return;
    }

    const resistanceMembers = gameState.roles
        .map((role, index) => role === 'Resistência' ? index : -1)
        .filter(index => index !== -1);

    // Só atribui Comandante se foi selecionado e há resistência disponível
    if (activeRoles.commander && resistanceMembers.length > 0) {
        const shuffledResistance = shuffle(resistanceMembers);
        const commander = shuffledResistance[0];
        gameState.specialRoles.commander = commander;
        gameState.roles[commander] = 'Comandante';

        // Remove o comandante da lista de resistência disponível
        const commanderIndex = resistanceMembers.indexOf(commander);
        if (commanderIndex > -1) {
            resistanceMembers.splice(commanderIndex, 1);
        }
    }

    // Só atribui Guarda-Costas se foi selecionado, há Comandante, e há resistência disponível
    if (activeRoles.bodyguard && gameState.specialRoles.commander >= 0 && resistanceMembers.length > 0) {
        const bodyguard = resistanceMembers[Math.floor(Math.random() * resistanceMembers.length)];
        gameState.specialRoles.bodyguard = bodyguard;
        gameState.roles[bodyguard] = 'Guarda-Costas';

        // Remove o guarda-costas da lista
        const bodyguardIndex = resistanceMembers.indexOf(bodyguard);
        if (bodyguardIndex > -1) {
            resistanceMembers.splice(bodyguardIndex, 1);
        }
    }

    // Só atribui Falso Comandante se foi selecionado e há espiões disponíveis
    if (activeRoles.falseCommander && spies.length > 0) {
        // Pega um espião que ainda não é Falso Comandante
        const availableSpies = spies.filter(spy => gameState.roles[spy] === 'Espião');
        if (availableSpies.length > 0) {
            const falseCommander = availableSpies[Math.floor(Math.random() * availableSpies.length)];
            gameState.specialRoles.falseCommander = falseCommander;
            gameState.roles[falseCommander] = 'Falso Comandante';
        }
    }
}

function revealCurrentRole() {
    if (gameState.currentPlayerIndex < gameState.numPlayers) {
        const playerName = gameState.players[gameState.currentPlayerIndex];
        const role = gameState.roles[gameState.currentPlayerIndex];

        document.getElementById('current-player-name').textContent = playerName;

        const roleElement = document.getElementById('current-player-role');
        roleElement.textContent = getRoleDisplayName(role);

        const roleInfo = getRoleInfo(role);
        roleElement.className = roleInfo.class;
        document.getElementById('role-description').innerHTML = roleInfo.description;
    }
}

function getRoleDisplayName(role) {
    const names = {
        'Resistência': 'Resistência',
        'Espião': 'Espião',
        'Comandante': 'Comandante 👑',
        'Guarda-Costas': 'Guarda-Costas 💂',
        'Falso Comandante': 'Falso Comandante 🎭'
    };
    return names[role] || role;
}

function getRoleInfo(role) {
    const activeRoles = getActiveSpecialRoles();

    const info = {
        'Resistência': {
            class: 'resistance-role',
            description: '🛡️ Você é da <strong>Resistência</strong>!<br><br>Tente deduzir quem são os espiões e garanta o sucesso das missões.'
        },
        'Espião': {
            class: 'spy-role',
            description: `🕵️ Você é um <strong>Espião</strong>! Sabote as missões secretamente.<br><br>
                         <strong>Seus aliados espiões são:</strong> ${getSpyAllies()}
                         ${activeRoles.falseCommander ? '<br><br>O <strong>Falso Comandante</strong> está se passando por Comandante para confundir a Resistência.' : ''}`
        },
        'Comandante': {
            class: 'resistance-role',
            description: `👑 Você é o <strong>Comandante</strong>!<br><br>
                         <strong>Os espiões são:</strong> ${getAllSpies()}<br><br>
                         ⚠️ <strong>CUIDADO:</strong> Se os espiões descobrirem quem você é no final do jogo, a Resistência perde automaticamente!
                         ${activeRoles.bodyguard ? '<br>💂 O Guarda-Costas está te protegendo.' : ''}`
        },
        'Guarda-Costas': {
            class: 'resistance-role',
            description: `💂 Você é o <strong>Guarda-Costas</strong>!<br><br>
                         <strong>O Comandante é:</strong> ${gameState.players[gameState.specialRoles.commander]}<br><br>
                         Sua missão é proteger o Comandante e desviar as suspeitas.`
        },
        'Falso Comandante': {
            class: 'spy-role',
            description: `🎭 Você é o <strong>Falso Comandante</strong>!<br><br>
                         <strong>Seus aliados espiões são:</strong> ${getSpyAllies()}<br><br>
                         Se passe por Comandante para confundir a Resistência!`
        }
    };

    return info[role] || info['Resistência'];
}

function getAllSpies() {
    const spies = [];
    for (let i = 0; i < gameState.numPlayers; i++) {
        if (gameState.roles[i].includes('Espião') || gameState.roles[i] === 'Falso Comandante') {
            spies.push(gameState.players[i]);
        }
    }
    return spies.join(', ');
}

function getSpyAllies() {
    const spies = [];
    for (let i = 0; i < gameState.numPlayers; i++) {
        if ((gameState.roles[i].includes('Espião') || gameState.roles[i] === 'Falso Comandante')
            && i !== gameState.currentPlayerIndex) {
            spies.push(gameState.players[i]);
        }
    }
    return spies.length > 0 ? spies.join(', ') : 'Nenhum outro espião';
}

function revealNextRole() {
    gameState.currentPlayerIndex++;

    if (gameState.currentPlayerIndex >= gameState.numPlayers) {
        startMissionPhase();
    } else {
        revealCurrentRole();
    }
}

// ============================================
// FASE DE MISSÃO
// ============================================
function startMissionPhase() {
    showScreen('game-screen');
    gameState.currentMission = 1;
    gameState.resistanceScore = 0;
    gameState.spyScore = 0;
    gameState.currentLeader = Math.floor(Math.random() * gameState.numPlayers);
    gameState.failedVotes = 0;

    updateGameUI();
    startTeamProposal();
}

function startTeamProposal() {
    gameState.phase = 'teamProposal';
    gameState.teamProposal = [];
    gameState.teamVotes = [];

    const config = missionConfig[gameState.numPlayers];
    const teamSize = config.missions[gameState.currentMission - 1];

    document.getElementById('leader-section').style.display = 'block';
    document.getElementById('voting-section').style.display = 'none';
    document.getElementById('mission-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';

    document.getElementById('leader-name').textContent = gameState.players[gameState.currentLeader];
    document.getElementById('team-size').textContent = teamSize;

    renderTeamSelection();
}

function renderTeamSelection() {
    const container = document.getElementById('team-selection');
    container.innerHTML = '';

    const config = missionConfig[gameState.numPlayers];
    const teamSize = config.missions[gameState.currentMission - 1];

    gameState.players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'team-member';
        playerDiv.textContent = player;
        playerDiv.onclick = () => toggleTeamMember(index);

        if (gameState.teamProposal.includes(index)) {
            playerDiv.classList.add('selected');
        }

        container.appendChild(playerDiv);
    });

    const confirmBtn = document.getElementById('confirm-team-btn');
    if (gameState.teamProposal.length === teamSize) {
        confirmBtn.style.display = 'block';
    } else {
        confirmBtn.style.display = 'none';
    }
}

function toggleTeamMember(playerIndex) {
    const config = missionConfig[gameState.numPlayers];
    const teamSize = config.missions[gameState.currentMission - 1];

    const index = gameState.teamProposal.indexOf(playerIndex);
    if (index > -1) {
        gameState.teamProposal.splice(index, 1);
    } else {
        if (gameState.teamProposal.length < teamSize) {
            gameState.teamProposal.push(playerIndex);
        }
    }

    renderTeamSelection();
}

// ============================================
// VOTAÇÃO DA EQUIPE (INDIVIDUAL E SECRETA)
// ============================================
function confirmTeam() {
    gameState.phase = 'teamVoting';
    gameState.currentTeamVoter = 0;
    gameState.teamVotes = [];

    document.getElementById('leader-section').style.display = 'none';
    document.getElementById('voting-section').style.display = 'block';

    showTeamVoterScreen();
}

function showTeamVoterScreen() {
    const currentVoterName = gameState.players[gameState.currentTeamVoter];

    document.getElementById('voting-section').innerHTML = `
        <h3>Votação da Equipe - Voto Secreto</h3>
        
        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="font-size: 1.2em;">Jogador atual: <strong>${currentVoterName}</strong></p>
            <p style="color: #e94560;">Passe o celular para ${currentVoterName}</p>
        </div>
        
        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin: 15px 0;">
            <h4>Equipe Proposta:</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                ${gameState.teamProposal.map(index =>
        `<div class="team-member">${gameState.players[index]}</div>`
    ).join('')}
            </div>
        </div>
        
        <p>Você aprova esta equipe para a missão?</p>
        
        <div style="display: flex; gap: 20px; justify-content: center; margin-top: 20px;">
            ${createTeamVoteButtons()}
        </div>
    `;
}

function createTeamVoteButtons() {
    const buttons = [
        { text: '✅ Aprovar', value: true, class: 'approve-btn' },
        { text: '❌ Rejeitar', value: false, class: 'reject-btn' }
    ];

    const shuffledButtons = Math.random() > 0.5 ? buttons : buttons.reverse();

    return `
        <button class="${shuffledButtons[0].class}" 
                onclick="voteOnTeam(${shuffledButtons[0].value})" 
                style="width: 200px; height: 80px; font-size: 1.2em;">
            ${shuffledButtons[0].text}
        </button>
        <button class="${shuffledButtons[1].class}" 
                onclick="voteOnTeam(${shuffledButtons[1].value})" 
                style="width: 200px; height: 80px; font-size: 1.2em;">
            ${shuffledButtons[1].text}
        </button>
    `;
}

function voteOnTeam(approved) {
    gameState.teamVotes.push(approved);
    gameState.currentTeamVoter++;

    if (gameState.currentTeamVoter < gameState.numPlayers) {
        showTeamVoterScreen();
    } else {
        showTeamVotingResult();
    }
}

function showTeamVotingResult() {
    const approveCount = gameState.teamVotes.filter(v => v).length;
    const rejectCount = gameState.teamVotes.filter(v => !v).length;

    document.getElementById('voting-section').innerHTML = `
        <h3>Resultado da Votação</h3>
        
        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <div style="display: flex; justify-content: center; gap: 40px; margin: 20px 0;">
                <div style="text-align: center;">
                    <div style="font-size: 2.5em; color: #00b894;">✅ ${approveCount}</div>
                    <div style="color: #00b894;">Aprovaram</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2.5em; color: #e17055;">❌ ${rejectCount}</div>
                    <div style="color: #e17055;">Rejeitaram</div>
                </div>
            </div>
        </div>
        
        <div id="voting-result-action"></div>
    `;

    if (approveCount > rejectCount) {
        document.getElementById('voting-result-action').innerHTML = `
            <div style="text-align: center; color: #00b894; margin: 20px 0;">
                <p style="font-size: 1.3em;">✅ Equipe Aprovada!</p>
                <p>A missão será iniciada...</p>
            </div>
            <button onclick="startMissionExecution()" style="background: #00b894; margin-top: 20px;">
                Iniciar Missão
            </button>
        `;
    } else {
        gameState.failedVotes++;

        if (gameState.failedVotes >= 5) {
            document.getElementById('voting-result-action').innerHTML = `
                <div style="text-align: center; color: #e17055; margin: 20px 0;">
                    <p style="font-size: 1.3em;">❌ 5 Equipes Rejeitadas!</p>
                    <p>Os espiões venceram por impasse!</p>
                </div>
                <button onclick="endGame('spies')" style="background: #e17055; margin-top: 20px;">
                    Ver Resultado Final
                </button>
            `;
        } else {
            document.getElementById('voting-result-action').innerHTML = `
                <div style="text-align: center; color: #e17055; margin: 20px 0;">
                    <p style="font-size: 1.3em;">❌ Equipe Rejeitada!</p>
                    <p>Rejeições consecutivas: ${gameState.failedVotes}/5</p>
                    <p>Um novo líder fará outra proposta...</p>
                </div>
                <button onclick="prepareNewProposal()" style="background: #e94560; margin-top: 20px;">
                    Nova Proposta
                </button>
            `;
        }
    }
}

function prepareNewProposal() {
    gameState.currentLeader = (gameState.currentLeader + 1) % gameState.numPlayers;
    startTeamProposal();
}

// ============================================
// EXECUÇÃO DA MISSÃO (VOTO SECRETO)
// ============================================
function startMissionExecution() {
    gameState.phase = 'mission';
    gameState.currentMissionVoter = 0;
    gameState.missionVotes = [];

    document.getElementById('voting-section').style.display = 'none';
    document.getElementById('mission-section').style.display = 'block';

    showCurrentVoterScreen();
}

function showCurrentVoterScreen() {
    const currentVoterIndex = gameState.teamProposal[gameState.currentMissionVoter];
    const currentVoterName = gameState.players[currentVoterIndex];

    document.getElementById('mission-section').innerHTML = `
        <h3>Fase da Missão - Voto Secreto</h3>
        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="font-size: 1.2em;">Jogador atual: <strong>${currentVoterName}</strong></p>
            <p style="color: #e94560;">Passe o celular para ${currentVoterName}</p>
        </div>
        <p>Vote secretamente no resultado da missão:</p>
        <div id="mission-vote-buttons"></div>
    `;

    createRandomizedButtons();
}

function createRandomizedButtons() {
    const buttonsContainer = document.getElementById('mission-vote-buttons');
    const currentVoterIndex = gameState.teamProposal[gameState.currentMissionVoter];
    const role = gameState.roles[currentVoterIndex];
    const isSpy = role.includes('Espião') || role === 'Falso Comandante';

    const buttons = [
        {
            text: '✅ Sucesso',
            value: true,
            class: 'success-btn',
            enabled: true
        },
        {
            text: '❌ Fracasso',
            value: false,
            class: 'fail-btn',
            enabled: isSpy
        }
    ];

    const shuffledButtons = Math.random() > 0.5 ? buttons : buttons.reverse();

    buttonsContainer.innerHTML = `
        <div style="text-align: center; margin: 20px 0;">
            ${isSpy ?
            '<p style="color: #ffd700; margin-bottom: 15px;">⚠️ Você é um ESPIÃO! Pode escolher Sucesso ou Fracasso</p>' :
            '<p style="color: #a0a0a0; margin-bottom: 15px;">🔒 Como Resistência, você deve votar Sucesso</p>'
        }
            <div style="display: flex; gap: 20px; justify-content: center;">
                <button class="${shuffledButtons[0].class}" 
                        onclick="performMission(${shuffledButtons[0].value})" 
                        style="width: 200px; height: 80px; font-size: 1.2em;"
                        ${!shuffledButtons[0].enabled ? 'disabled' : ''}>
                    ${shuffledButtons[0].text}
                    ${!shuffledButtons[0].enabled ? '<br><small style="font-size: 0.7em;">(Bloqueado)</small>' : ''}
                </button>
                <button class="${shuffledButtons[1].class}" 
                        onclick="performMission(${shuffledButtons[1].value})" 
                        style="width: 200px; height: 80px; font-size: 1.2em;"
                        ${!shuffledButtons[1].enabled ? 'disabled' : ''}>
                    ${shuffledButtons[1].text}
                    ${!shuffledButtons[1].enabled ? '<br><small style="font-size: 0.7em;">(Bloqueado)</small>' : ''}
                </button>
            </div>
        </div>
    `;

    const disabledButton = document.querySelector('.fail-btn[disabled]');
    if (disabledButton) {
        disabledButton.style.opacity = '0.5';
        disabledButton.style.cursor = 'not-allowed';
    }
}

function performMission(success) {
    const currentVoterIndex = gameState.teamProposal[gameState.currentMissionVoter];
    const role = gameState.roles[currentVoterIndex];
    const isSpy = role.includes('Espião') || role === 'Falso Comandante';

    if (!isSpy && !success) {
        return;
    }

    gameState.missionVotes.push(success);
    gameState.currentMissionVoter++;

    if (gameState.currentMissionVoter < gameState.teamProposal.length) {
        showCurrentVoterScreen();
    } else {
        evaluateMission();
    }
}

// ============================================
// AVALIAÇÃO DA MISSÃO (RESULTADO ANÔNIMO)
// ============================================
function evaluateMission() {
    const successCount = gameState.missionVotes.filter(v => v).length;
    const failCount = gameState.missionVotes.filter(v => !v).length;
    const missionSuccess = failCount === 0;

    document.getElementById('mission-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'block';

    const resultText = document.getElementById('mission-result-text');
    const missionCards = document.getElementById('mission-cards');

    if (missionSuccess) {
        gameState.resistanceScore++;
        resultText.innerHTML = `
            <div style="font-size: 1.5em; margin-bottom: 20px;">
                ✅ Missão bem-sucedida!
            </div>
            <div style="color: #00b894;">
                Resistência ganha um ponto
            </div>
        `;
    } else {
        gameState.spyScore++;
        resultText.innerHTML = `
            <div style="font-size: 1.5em; margin-bottom: 20px;">
                ❌ Missão fracassou!
            </div>
            <div style="color: #e17055;">
                Espiões ganham um ponto
            </div>
        `;
    }

    missionCards.innerHTML = `
        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h4>Resultado da Votação Secreta:</h4>
            <div style="display: flex; justify-content: center; gap: 40px; margin-top: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 2em; color: #00b894;">✅ ${successCount}</div>
                    <div style="color: #00b894;">Sucessos</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2em; color: #e17055;">❌ ${failCount}</div>
                    <div style="color: #e17055;">Fracassos</div>
                </div>
            </div>
            <p style="margin-top: 20px; color: #a0a0a0; font-style: italic;">
                ${gameState.teamProposal.length} jogadores participaram da missão
            </p>
        </div>
    `;

    gameState.missionResults.push(missionSuccess);
    updateGameUI();

    if (gameState.resistanceScore >= 3) {
        setTimeout(() => {
            const activeRoles = getActiveSpecialRoles();
            if (activeRoles.commander) {
                showCommanderGuess();
            } else {
                endGame('resistance');
            }
        }, 3000);
    } else if (gameState.spyScore >= 3) {
        setTimeout(() => endGame('spies'), 3000);
    }
}

// ============================================
// ADIVINHAÇÃO DO COMANDANTE
// ============================================
function showCommanderGuess() {
    document.getElementById('results-section').style.display = 'none';

    const gameScreen = document.getElementById('game-screen');
    const tempDiv = document.createElement('div');
    tempDiv.id = 'commander-guess-screen';
    tempDiv.innerHTML = `
        <h2 style="text-align: center; color: #ffd700;">🧐 Momento dos Espiões</h2>
        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <p>A Resistência completou 3 missões, mas...</p>
            <p style="font-size: 1.2em; margin: 20px 0;">Os espiões têm uma última chance!</p>
            <p>Se descobrirem quem é o <strong>Comandante</strong>, vencem o jogo!</p>
        </div>
        <p style="text-align: center;">Espiões, quem é o Comandante?</p>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 20px 0;">
            ${gameState.players.map((player, index) => `
                <button onclick="checkCommanderGuess(${index})" 
                        style="padding: 15px 25px; background: #e94560; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1em;">
                    ${player}
                </button>
            `).join('')}
        </div>
    `;

    gameScreen.appendChild(tempDiv);
}

function checkCommanderGuess(guessedIndex) {
    if (guessedIndex === gameState.specialRoles.commander) {
        endGame('spies_commander');
    } else {
        const guessScreen = document.getElementById('commander-guess-screen');
        if (guessScreen) guessScreen.remove();

        endGame('resistance');
    }
}

// ============================================
// CONTROLES DE RODADA E FIM DE JOGO
// ============================================
function nextRound() {
    if (gameState.resistanceScore >= 3 || gameState.spyScore >= 3) {
        return;
    }

    gameState.currentMission++;
    gameState.currentLeader = (gameState.currentLeader + 1) % gameState.numPlayers;
    document.getElementById('mission-number').textContent = gameState.currentMission;

    startTeamProposal();
}

function updateGameUI() {
    document.getElementById('resistance-score').textContent = gameState.resistanceScore;
    document.getElementById('spy-score').textContent = gameState.spyScore;
}

function endGame(winner) {
    const guessScreen = document.getElementById('commander-guess-screen');
    if (guessScreen) guessScreen.remove();

    showScreen('end-screen');

    const endMessage = document.getElementById('end-message');

    if (winner === 'resistance') {
        endMessage.textContent = '🎉 A Resistência Venceu!';
        endMessage.style.color = '#00b894';
    } else if (winner === 'spies_commander') {
        endMessage.textContent = '🕵️ Os Espiões Venceram! (Descobriram o Comandante)';
        endMessage.style.color = '#e17055';
    } else {
        endMessage.textContent = '🕵️ Os Espiões Venceram!';
        endMessage.style.color = '#e17055';
    }

    const roleReveal = document.getElementById('role-reveal-all');
    roleReveal.innerHTML = '<h3>Papéis Revelados:</h3>';

    gameState.players.forEach((player, index) => {
        const role = gameState.roles[index];
        const roleClass = role.includes('Espião') || role === 'Falso Comandante' ? 'spy-role' : 'resistance-role';
        const roleIcon = getRoleIcon(role);

        roleReveal.innerHTML += `
            <div class="team-member ${roleClass}">
                ${roleIcon} ${player}: ${getRoleDisplayName(role)}
            </div>`;
    });

    // Mostrar informações dos papéis especiais que foram usados
    const activeRoles = getActiveSpecialRoles();
    let specialInfo = '';
    if (activeRoles.commander && gameState.specialRoles.commander >= 0) {
        specialInfo += `<p>👑 O verdadeiro Comandante era: <strong>${gameState.players[gameState.specialRoles.commander]}</strong></p>`;
    }
    if (activeRoles.bodyguard && gameState.specialRoles.bodyguard >= 0) {
        specialInfo += `<p>💂 O Guarda-Costas era: <strong>${gameState.players[gameState.specialRoles.bodyguard]}</strong></p>`;
    }
    if (activeRoles.falseCommander && gameState.specialRoles.falseCommander >= 0) {
        specialInfo += `<p>🎭 O Falso Comandante era: <strong>${gameState.players[gameState.specialRoles.falseCommander]}</strong></p>`;
    }

    if (specialInfo) {
        roleReveal.innerHTML += `
            <div style="margin-top: 20px; padding: 15px; background: rgba(255,215,0,0.2); border-radius: 10px; text-align: center;">
                ${specialInfo}
            </div>`;
    }
}

function getRoleIcon(role) {
    const icons = {
        'Resistência': '🛡️',
        'Espião': '🕵️',
        'Comandante': '👑',
        'Guarda-Costas': '💂',
        'Falso Comandante': '🎭'
    };
    return icons[role] || '🛡️';
}

function resetGame() {
    gameState.players = [];
    gameState.roles = [];
    gameState.missionResults = [];
    gameState.currentMission = 1;
    gameState.resistanceScore = 0;
    gameState.spyScore = 0;
    gameState.failedVotes = 0;
    gameState.phase = 'setup';
    gameState.currentMissionVoter = 0;
    gameState.currentTeamVoter = 0;
    gameState.specialRoles = {
        commander: -1,
        bodyguard: -1,
        falseCommander: -1
    };
    gameState.useSpecialRoles = false;

    showScreen('setup-screen');
    generatePlayerInputs();
}

// Inicializar
generatePlayerInputs();