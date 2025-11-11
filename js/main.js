// ================= CONFIGURAÇÕES =================
const TOTAL_STEPS = 14; 
const WEBHOOK_URL = "https://n8nbluelephant.up.railway.app/webhook/3ba80772-7612-4a54-a6c4-e4e3e5854e6d";

// Mude para 'false' para enviar ao n8n.
// 'true' pula o envio e vai direto para a tela de sucesso (para testar a UX).
const DEBUG_MODE = true; 

let currentStep = 1;
const formElement = document.getElementById('wizardForm');

// Mapeamento de Etapas para Blocos
const BLOCK_MAP = {
  'questionario': [1, 6],
  'configuracao': [7, 12],
  'conhecimento': [13, 14]
};

// ================= ELEMENTOS UI =================
const progressBar = document.getElementById('progressBar');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const blockNavContainer = document.querySelector('.block-nav-container');

// Armazena todos os arquivos
let uploadedFiles = {};

// Inicializa UI
updateUI();
initializeFileUploads();
initializeDynamicListeners();

// ================= FUNÇÃO CENTRAL DE NAVEGAÇÃO =================
async function changeStep(direction) {
  // Valida antes de avançar
  if (direction === 1 && !validateCurrentStep()) return;

  const form = formElement; 

  // ----------------------------------------------------------------
  // PONTO DE INTEGRAÇÃO IA (AO SAIR DA ETAPA 3 -> VAI PARA 4)
  // ----------------------------------------------------------------
  if (currentStep === 3 && direction === 1) {
    await showLoading("Analisando seu mercado...", 1000); 
    
    const mockFeedback = `Entendi! Para vender **${form.PRODUTO_OU_SERVICO.value}** para **${form.ICP_DESCRICAO.value}**, o maior gargalo realmente é a **${form.DORES_PRINCIPAIS.value}**. \n\nVamos definir como o agente vai filtrar isso.`;
    document.getElementById('ai_feedback_1_content').innerHTML = mockFeedback; 
    document.getElementById('ai_feedback_1').style.display = 'block';
  }

  // Avança a etapa
  currentStep += direction;
  if (currentStep < 1) currentStep = 1;
  if (currentStep > TOTAL_STEPS) currentStep = TOTAL_STEPS;

  updateUI();

  // Ajusta botão final
  if (currentStep === TOTAL_STEPS) {
    nextBtn.innerHTML = "🚀 Finalizar e Criar";
    nextBtn.onclick = finalSubmit;
  } else {
    nextBtn.innerHTML = "Continuar →";
    nextBtn.onclick = () => changeStep(1);
  }
}

// ================= FUNÇÕES AUXILIARES DE UI =================
function updateUI() {
  // 1. Ativa a Etapa (Step) correta
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');

  // 2. Atualiza a Barra de Progresso
  const progress = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  progressBar.style.width = `${currentStep === 1 ? 2 : progress}%`;

  // 3. Atualiza a Navegação de Blocos
  document.querySelectorAll('.block-nav-item').forEach(item => item.classList.remove('active'));
  let currentBlockId = null;
  if (currentStep >= BLOCK_MAP.questionario[0] && currentStep <= BLOCK_MAP.questionario[1]) {
    currentBlockId = 'questionario';
  } else if (currentStep >= BLOCK_MAP.configuracao[0] && currentStep <= BLOCK_MAP.configuracao[1]) {
    currentBlockId = 'configuracao';
  } else if (currentStep >= BLOCK_MAP.conhecimento[0] && currentStep <= BLOCK_MAP.conhecimento[1]) {
    currentBlockId = 'conhecimento';
  }
  
  if (currentBlockId) {
    document.querySelector(`.block-nav-item[data-block-id="${currentBlockId}"]`).classList.add('active');
  }

  // 4. Mostra/Esconde Botão "Voltar"
  prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
  
  // 5. Rola para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
  const activeStep = document.querySelector('.step.active');
  if (!activeStep || activeStep.dataset.step === 'success') return true; // Etapa de sucesso não valida
  
  const requiredInputs = activeStep.querySelectorAll('input[required], textarea[required], select[required]');
  let isValid = true;
  let firstInvalidInput = null;
        
  requiredInputs.forEach(input => {
    input.classList.remove('error');
    if (!input.value.trim()) {
      isValid = false; 
      input.classList.add('error');
      if (!firstInvalidInput) {
        firstInvalidInput = input; // Salva o primeiro campo inválido
      }
    }
  });
  
  if (firstInvalidInput) {
    firstInvalidInput.focus(); // Foca no primeiro campo inválido
  }
  
  return isValid;
}


function showLoading(msg, duration=1000) {
  loadingMessage.innerText = msg; loadingOverlay.style.display = 'flex';
  return new Promise(resolve => setTimeout(() => { loadingOverlay.style.display = 'none'; resolve(); }, duration));
}

window.selectCard = function(el, inputId, val) {
  el.parentElement.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected'); document.getElementById(inputId).value = val;
}

// ================= LISTENERS DINÂMICOS =================

function initializeDynamicListeners() {
  
    // [CORREÇÃO DO BUG]
    // Ouve o clique no 'label' (o card) e atualiza o input.
    document.querySelectorAll('.checkbox-card-visual').forEach(card => {
        const cb = card.querySelector('input[type="checkbox"]');
        
        // Sincroniza o visual com o estado do checkbox no carregamento
        card.classList.toggle('selected', cb.checked);

        card.addEventListener('click', (e) => {
            // Se o clique for no sub-checkbox, não faça nada
            if (e.target.closest('.nested-checkbox')) {
                return;
            }
            
            // Inverte o estado do checkbox
            cb.checked = !cb.checked;
            
            // Sincroniza o visual
            card.classList.toggle('selected', cb.checked);
            
            // Dispara o evento de 'change' manualmente para outros listeners (como o da tool de mídia)
            cb.dispatchEvent(new Event('change'));
        });
    });
    
    // Listener para a Tool de Mídia (mostrar/esconder upload)
    const toolMidiaCheckbox = document.getElementById('tool_midia_checkbox');
    if (toolMidiaCheckbox) {
        
        const mediaUploadSection = document.getElementById('media_upload_section');
        const nestedAudioFlag = document.getElementById('nested_audio_flag');
        
        // Função para Sincronizar
        const syncMediaTool = () => {
            const isChecked = toolMidiaCheckbox.checked;
            mediaUploadSection.style.display = isChecked ? 'block' : 'none';
            nestedAudioFlag.style.display = isChecked ? 'flex' : 'none';
            if (!isChecked) {
                const nestedInput = document.getElementById('FLAG_ENVIO_ARQUIVO_AUDIO');
                if(nestedInput) nestedInput.checked = false;
            }
        };
        
        // Sincroniza no carregamento
        syncMediaTool();
        
        // Sincroniza em qualquer mudança
        toolMidiaCheckbox.addEventListener('change', syncMediaTool);
    }
}


// ================= LÓGICA DE UPLOAD DE ARQUIVOS =================

function initializeFileUploads() {
    document.querySelectorAll('.file-drop-area').forEach(dropArea => {
        const inputName = dropArea.dataset.inputName;
        const fileInput = dropArea.querySelector('.file-input-hidden');
        const fileListContainer = dropArea.querySelector('.file-list-container');
        const isMultiple = fileInput.multiple;
        
        uploadedFiles[inputName] = []; 
        
        dropArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFiles(e.target.files, inputName, isMultiple));
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        dropArea.addEventListener('drop', (e) => {
            handleFiles(e.dataTransfer.files, inputName, isMultiple);
        }, false);
    });
}

function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

function handleFiles(files, inputName, isMultiple) {
    const fileArray = [...files];
    
    if (isMultiple) {
        uploadedFiles[inputName].push(...fileArray);
    } else {
        uploadedFiles[inputName] = [fileArray[0]]; 
    }
    
    renderFileList(inputName);
}

function renderFileList(inputName) {
    const dropArea = document.querySelector(`.file-drop-area[data-input-name="${inputName}"]`);
    const fileListContainer = dropArea.querySelector('.file-list-container');
    
    fileListContainer.innerHTML = ''; 
    
    uploadedFiles[inputName].forEach((file, index) => {
        fileListContainer.innerHTML += `
            <div class="file-item">
                📄 ${file.name} 
                <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: auto;">(${(file.size / 1024).toFixed(1)} KB)</span>
                <span style="cursor:pointer; margin-left: 10px; color:var(--error);" onclick="removeFile('${inputName}', ${index})">✖</span>
            </div>`;
    });
}

window.removeFile = function(inputName, index) {
    uploadedFiles[inputName].splice(index, 1);
    renderFileList(inputName);
}

// ================= SUBMISSÃO FINAL =================
async function finalSubmit() {
    if (!validateCurrentStep()) {
         alert("Ops! Parece que você esqueceu de preencher um campo obrigatório. Verifique os campos em vermelho.");
         return;
    }
    
    await showLoading("Enviando tudo para a Neural Matrix...", 3000);
    
    const formData = new FormData(formElement);
    const form = formElement; 
    
    Object.keys(uploadedFiles).forEach(inputName => {
        const files = uploadedFiles[inputName];
        files.forEach((file, i) => {
            // Chave de formulário: 'nome_do_input_0', 'nome_do_input_1' para múltiplos
            const formKey = (isMultipleUpload(inputName)) 
                            ? `${inputName}_${i}` 
                            : inputName;
            formData.append(formKey, file);
        });
    });
    
    // Função helper para saber se o input é multi-upload
    function isMultipleUpload(inputName) {
        const el = document.querySelector(`.file-drop-area[data-input-name="${inputName}"] .file-input-hidden`);
        return el && el.multiple;
    }

    // LÓGICA DE DEBUG PARA PULAR O FETCH
    if (DEBUG_MODE) {
        console.log("MODO DEBUG ATIVADO. Pulando fetch.");
        // Simula os dados que seriam enviados
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simula espera
        loadingOverlay.style.display = 'none';
        showSuccessScreen(form);
        return; // Pula o resto da função
    }

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: formData 
        });

        if (!response.ok) {
            throw new Error(`Erro na rede: ${response.statusText}`);
        }

        loadingOverlay.style.display = 'none';
        showSuccessScreen(form);

    } catch (error) {
        console.error('Erro na submissão (fetch):', error);
        alert("❌ Erro! Não foi possível enviar os dados. Verifique o console (F12) ou contate o suporte.");
        loadingOverlay.style.display = 'none'; 
    }
}

// Função separada para mostrar a tela de sucesso
function showSuccessScreen(form) {
    // 1. Esconde botões, progresso e navegação de blocos
    document.querySelector('.nav-buttons').style.display = 'none';
    document.querySelector('.progress-container').style.display = 'none';
    document.querySelector('.block-nav-container').style.display = 'none';

    // 2. Prepara o conteúdo do Playbook
    const playbookContent = `
        <h4>1. Saudação & Rapport</h4>
        <ul>
            <li><strong>Saudação:</strong> "${form.MENSAGEM_SAUDACAO.value}"</li>
            ${form.PERGUNTAS_RAPPORT.value ? `<li><strong>Rapport:</strong> ${form.PERGUNTAS_RAPPORT.value.replace(/\n/g, ', ')}</li>` : ''}
        </ul>
        <h4>2. Qualificação</h4>
        <ul>
            <li><strong>Objetivo:</strong> Identificar se o lead tem o perfil: <strong>${form.CRITERIOS_LEAD_QUALIFICADO.value || "Não definido"}</strong>.</li>
            <li><strong>Perguntas-Chave:</strong></li>
            <ul>
                ${form.QUALIFICACAO_PERGUNTAS.value.split('\n').map(q => `<li>${q}</li>`).join('')}
            </ul>
        </ul>
        <h4>3. Conversão / Direcionamento</h4>
        <ul>
            <li><strong>Se QUALIFICADO:</strong> O agente tentará o agendamento.</li>
            ${form.MENSAGEM_NAO_QUALIFICACAO.value ? `<li><strong>Se NÃO QUALIFICADO:</strong> "${form.MENSAGEM_NAO_QUALIFICACAO.value}"</li>` : ''}
        </ul>
    `;
    document.getElementById('ai_feedback_playbook_content_success').innerHTML = playbookContent;

    // 3. Esconde a última etapa e mostra a de sucesso
    document.querySelector('.step.active').classList.remove('active');
    document.querySelector('.step[data-step="success"]').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}