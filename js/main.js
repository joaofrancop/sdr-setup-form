// ================= CONFIGURAÇÕES =================
const TOTAL_STEPS = 14; 
const WEBHOOK_URL = "https://n8nbluelephant.up.railway.app/webhook/3ba80772-7612-4a54-a6c4-e4e3e5854e6d";
const WEBHOOK_URL_2 = "https://n8nbluelephant.up.railway.app/webhook/0f5b3f3d-34fa-424d-9d0e-c1013066ed26";
const DEBUG_MODE = false; 
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
  if (direction === 1 && !validateCurrentStep()) return;
  const form = formElement; 

  if (currentStep === 3 && direction === 1) {
    await showLoading("Analisando seu mercado...", 1000); 
    // [CORREÇÃO] Lê o primeiro item do array de produtos para o mock
    const produtoInputs = form['PRODUTO_OU_SERVICO[]'];
    let primeiroProduto = "seu produto";
    if (produtoInputs) {
      primeiroProduto = produtoInputs.length ? produtoInputs[0].value : produtoInputs.value;
    }
    const mockFeedback = `Entendi! Para vender **${primeiroProduto}** para **${form.ICP_DESCRICAO.value}**, o maior gargalo realmente é a **${form.DORES_PRINCIPAIS.value}**. \n\nVamos definir como o agente vai filtrar isso.`;
    document.getElementById('ai_feedback_1_content').innerHTML = mockFeedback; 
    document.getElementById('ai_feedback_1').style.display = 'block';
  }

  currentStep += direction;
  if (currentStep < 1) currentStep = 1;
  if (currentStep > TOTAL_STEPS) currentStep = TOTAL_STEPS;

  updateUI();

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
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');

  const progress = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  progressBar.style.width = `${currentStep === 1 ? 2 : progress}%`;

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

  prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
  const activeStep = document.querySelector('.step.active');
  if (!activeStep || activeStep.dataset.step === 'success') return true;
  
  const requiredInputs = activeStep.querySelectorAll('input[required], textarea[required], select[required]');
  let isValid = true;
  let firstInvalidInput = null;
        
  requiredInputs.forEach(input => {
    input.classList.remove('error');
    if (!input.value.trim()) {
      isValid = false; 
      input.classList.add('error');
      if (!firstInvalidInput) {
        firstInvalidInput = input;
      }
    }
  });
  
  if (firstInvalidInput) {
    firstInvalidInput.focus();
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
  
    // Listener para Clicar nos Checkbox-Cards (BUG CORRIGIDO)
    document.querySelectorAll('.checkbox-card-visual').forEach(card => {
        const cb = card.querySelector('input[type="checkbox"]');
        card.classList.toggle('selected', cb.checked);

        card.addEventListener('click', (e) => {
            if (e.target.closest('.nested-checkbox')) {
                return; 
            }
            cb.checked = !cb.checked;
            card.classList.toggle('selected', cb.checked);
            cb.dispatchEvent(new Event('change'));
        });
    });
    
    // Listener para a Tool de Mídia (mostrar/esconder upload)
    const toolMidiaCheckbox = document.getElementById('tool_midia_checkbox');
    if (toolMidiaCheckbox) {
        const mediaUploadSection = document.getElementById('media_upload_section');
        const nestedAudioFlag = document.getElementById('nested_audio_flag');
        
        const syncMediaTool = () => {
            const isChecked = toolMidiaCheckbox.checked;
            mediaUploadSection.style.display = isChecked ? 'block' : 'none';
            nestedAudioFlag.style.display = isChecked ? 'flex' : 'none';
            if (!isChecked) {
                const nestedInput = document.getElementById('FLAG_ENVIO_ARQUIVO_AUDIO');
                if(nestedInput) nestedInput.checked = false;
            }
        };
        syncMediaTool();
        toolMidiaCheckbox.addEventListener('change', syncMediaTool);
    }

    // --- [NOVO] Listener para Lista Dinâmica de Produtos ---
    const container = document.getElementById('produtos-servicos-container');
    
    // Botão de Adicionar
    document.getElementById('add-produto-btn').addEventListener('click', () => {
      const newItem = document.createElement('div');
      newItem.className = 'produto-servico-item';
      newItem.innerHTML = `
        <input type="text" name="PRODUTO_OU_SERVICO[]" class="input-modern" placeholder="Ex: Consultoria Financeira" required>
        <button type="button" class="btn-remove">&times;</button>
      `;
      // Mostra o botão de remover no item anterior (se houver)
      const prevItem = container.lastElementChild;
      if (prevItem) {
        const prevRemoveBtn = prevItem.querySelector('.btn-remove');
        if(prevRemoveBtn) prevRemoveBtn.style.display = 'block';
      }
      
      container.appendChild(newItem);
    });

    // Botão de Remover (com delegação de evento)
    container.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('btn-remove')) {
        // Não remove se for o primeiro item
        if (e.target.closest('.produto-servico-item') !== container.firstElementChild) {
            e.target.closest('.produto-servico-item').remove();
        }
      }
    });
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
    
    const form = formElement; // Pega o elemento do formulário

    // --- [LÓGICA DE ENVIO MODIFICADA] ---

    // Helper function para criar o FormData
    // Isto é necessário porque um 'body' de FormData só pode ser consumido uma vez.
    // Precisamos recriá-lo para a segunda chamada.
    function createFormData() {
        const formData = new FormData(formElement);
        Object.keys(uploadedFiles).forEach(inputName => {
            const files = uploadedFiles[inputName];
            files.forEach((file, i) => {
                const formKey = (isMultipleUpload(inputName)) 
                                ? `${inputName}_${i}` 
                                : inputName;
                formData.append(formKey, file);
            });
        });
        return formData;
    }
    
    function isMultipleUpload(inputName) {
        const el = document.querySelector(`.file-drop-area[data-input-name="${inputName}"] .file-input-hidden`);
        return el && el.multiple;
    }

    if (DEBUG_MODE) {
        console.log("MODO DEBUG ATIVADO. Pulando fetch.");
        const debugData = createFormData(); // Cria os dados para o log
        for (let [key, value] of debugData.entries()) {
            console.log(key, value);
        }
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        loadingOverlay.style.display = 'none';
        showSuccessScreen(form);
        return; 
    }

    try {
        // Envia para o Webhook 1
        const response1 = await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: createFormData() // Cria o FormData para a primeira chamada
        });
        if (!response1.ok) {
            throw new Error(`Erro no Webhook 1: ${response1.statusText}`);
        }

        // Envia para o Webhook 2
        const response2 = await fetch(WEBHOOK_URL_2, {
            method: 'POST',
            body: createFormData() // RECRIA o FormData para a segunda chamada
        });
        if (!response2.ok) {
            throw new Error(`Erro no Webhook 2: ${response2.statusText}`);
        }

        // Se ambos funcionarem, mostra o sucesso
        loadingOverlay.style.display = 'none';
        showSuccessScreen(form);

    } catch (error) {
        console.error('Erro na submissão (fetch):', error);
        alert("❌ Erro! Não foi possível enviar os dados. Tente novamente ou contate o suporte.");
        loadingOverlay.style.display = 'none'; 
    }
}

function showSuccessScreen(form) {
    document.querySelector('.nav-buttons').style.display = 'none';
    document.querySelector('.progress-container').style.display = 'none';
    document.querySelector('.block-nav-container').style.display = 'none';

    // Pega o primeiro produto/serviço para o mock
    const produtoInputs = form['PRODUTO_OU_SERVICO[]'];
    let primeiroProduto = "seu produto";
    if (produtoInputs) {
      // Se for um único campo, é um elemento. Se forem múltiplos, é uma NodeList.
      primeiroProduto = produtoInputs.length ? produtoInputs[0].value : produtoInputs.value;
    }

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
        <h4>3. Contexto do Produto</h4>
        <ul>
            <li><strong>Produto Principal:</strong> ${primeiroProduto}</li>
            <li><strong>Cliente Ideal:</strong> ${form.ICP_DESCRICAO.value}</li>
        </ul>
    `;
    document.getElementById('ai_feedback_playbook_content_success').innerHTML = playbookContent;

    document.querySelector('.step.active').classList.remove('active');
    document.querySelector('.step[data-step="success"]').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
