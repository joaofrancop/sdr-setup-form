// ================= CONFIGURAÇÕES =================
const TOTAL_STEPS = 14;
const WEBHOOK_URL = "https://n8nbluelephant.up.railway.app/webhook/3ba80772-7612-4a54-a6c4-e4e3e5854e6d";
const WEBHOOK_URL_2 = "https://n8nbluelephant.up.railway.app/webhook/0f5b3f3d-34fa-424d-9d0e-c1013066ed26";
const WEBHOOK_URL_3 = "https://n8nbluelephant.up.railway.app/webhook/d88a0a70-738a-448d-8bf9-d31a54cfa83a";
const DEBUG_MODE = false;
let currentStep = 1;
const formElement = document.getElementById('wizardForm');

const BLOCK_MAP = {
  'questionario': [1, 6],
  'configuracao': [7, 12],
  'conhecimento': [13, 14]
};

let loadingInterval;
const loadingMessages = [
  "Analisando seu mercado...",
  "Gerando seu playbook de vendas...",
  "Configurando a personalidade do agente...",
  "Polindo os detalhes...",
  "Quase pronto..."
];

const progressBar = document.getElementById('progressBar');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const blockNavContainer = document.querySelector('.block-nav-container');
let uploadedFiles = {};

updateUI();
initializeFileUploads();
initializeDynamicListeners();

// ================= FUNÇÃO CENTRAL DE NAVEGAÇÃO =================
async function changeStep(direction) {
  if (direction === 1 && !validateCurrentStep()) return;
  const form = formElement;

  if (currentStep === 3 && direction === 1) {
    showLoading("Analisando seu mercado...");
    const produtoInputs = form['PRODUTO_OU_SERVICO[]'];
    let primeiroProduto = "seu produto";
    if (produtoInputs) {
      primeiroProduto = produtoInputs.length ? produtoInputs[0].value : produtoInputs.value;
    }
    const feedback = '';
    document.getElementById('ai_feedback_1_content').innerHTML = feedback;
    document.getElementById('ai_feedback_1').style.display = 'block';

    try {
      const response = await fetch(WEBHOOK_URL_3, {
        method: "POST",
        body: createFormData()
      });
      if (!response.ok) throw new Error(`Erro ao chamar o webhook 3: ${response.statusText}`);
      let feedback = await response.text();
      hideLoading();
      document.getElementById("ai_feedback_1_content").textContent = feedback;
      document.getElementById("ai_feedback_1").style.display = "block";
    } catch (error) {
      hideLoading();
      console.error("Erro ao buscar feedback:", error);
      document.getElementById("ai_feedback_1_content").textContent =
        "Ótimo segmento de mercado! Com certeza conseguimos automatizar suas dores 😄";
      document.getElementById("ai_feedback_1").style.display = "block";
    }
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

  if (currentBlockId)
    document.querySelector(`.block-nav-item[data-block-id="${currentBlockId}"]`).classList.add('active');

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
      if (!firstInvalidInput) firstInvalidInput = input;
    }
  });
  if (firstInvalidInput) firstInvalidInput.focus();
  return isValid;
}

function showLoading(initialMsg) {
  loadingMessage.innerText = initialMsg;
  loadingOverlay.style.display = 'flex';
  if (loadingInterval) clearInterval(loadingInterval);
  let messageIndex = 0;
  loadingInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % loadingMessages.length;
    loadingMessage.innerText = loadingMessages[messageIndex];
  }, 5000);
}

function hideLoading() {
  if (loadingInterval) clearInterval(loadingInterval);
  loadingOverlay.style.display = 'none';
}

window.selectCard = function (el, inputId, val) {
  el.parentElement.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById(inputId).value = val;
}

// ================= LISTENERS DINÂMICOS =================
function initializeDynamicListeners() {
  document.querySelectorAll('.checkbox-card-visual').forEach(card => {
    const cb = card.querySelector('input[type="checkbox"]');
    card.classList.toggle('selected', cb.checked);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.nested-checkbox')) return;
      cb.checked = !cb.checked;
      card.classList.toggle('selected', cb.checked);
      cb.dispatchEvent(new Event('change'));
    });
  });

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
        if (nestedInput) nestedInput.checked = false;
      }
    };
    syncMediaTool();
    toolMidiaCheckbox.addEventListener('change', syncMediaTool);
  }

  const container = document.getElementById('produtos-servicos-container');
  document.getElementById('add-produto-btn').addEventListener('click', () => {
    const newItem = document.createElement('div');
    newItem.className = 'produto-servico-item';
    newItem.innerHTML = `
      <input type="text" name="PRODUTO_OU_SERVICO[]" class="input-modern"
      placeholder="Ex: Consultoria Financeira" required>
      <button type="button" class="btn-remove">&times;</button>`;
    const prevItem = container.lastElementChild;
    if (prevItem) {
      const prevRemoveBtn = prevItem.querySelector('.btn-remove');
      if (prevRemoveBtn) prevRemoveBtn.style.display = 'block';
    }
    container.appendChild(newItem);
  });

  container.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('btn-remove')) {
      if (e.target.closest('.produto-servico-item') !== container.firstElementChild)
        e.target.closest('.produto-servico-item').remove();
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
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName =>
      dropArea.addEventListener(eventName, preventDefaults, false)
    );
    dropArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files, inputName, isMultiple), false);
  });
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleFiles(files, inputName, isMultiple) {
  const fileArray = [...files];
  if (isMultiple) uploadedFiles[inputName].push(...fileArray);
  else uploadedFiles[inputName] = [fileArray[0]];
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
        <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: auto;">
          (${(file.size / 1024).toFixed(1)} KB)
        </span>
        <span style="cursor:pointer; margin-left: 10px; color:var(--error);"
        onclick="removeFile('${inputName}', ${index})">✖</span>
      </div>`;
  });
}

window.removeFile = function (inputName, index) {
  uploadedFiles[inputName].splice(index, 1);
  renderFileList(inputName);
}

function createFormData() {
  const formData = new FormData(formElement);
  Object.keys(uploadedFiles).forEach(inputName => {
    const files = uploadedFiles[inputName];
    files.forEach((file, i) => {
      const formKey = (isMultipleUpload(inputName)) ? `${inputName}_${i}` : inputName;
      formData.append(formKey, file);
    });
  });
  return formData;
}

function isMultipleUpload(inputName) {
    const el = document.querySelector(`.file-drop-area[data-input-name="${inputName}"] .file-input-hidden`);
    return el && el.multiple;
  }

// ================= SUBMISSÃO FINAL =================
async function finalSubmit() {
  if (!validateCurrentStep()) {
    alert("Ops! Parece que você esqueceu de preencher um campo obrigatório.");
    return;
  }
  showLoading("Iniciando envio...");
  const form = formElement;
  

  if (DEBUG_MODE) {
    console.log("MODO DEBUG ATIVADO. Pulando fetch.");
    const debugData = createFormData();
    for (let [key, value] of debugData.entries()) console.log(key, value);
    await new Promise(r => setTimeout(r, 1500));
    hideLoading();
    showSuccessScreen(form);
    return;
  }

  try {
    const formData = createFormData();
    console.log('Enviando para Webhook 1 (n8n)...');
    // const response1 = await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
    // if (!response1.ok) throw new Error(`Erro no Webhook 1 (n8n): ${response1.statusText}`);
    console.log('Envio para Webhook 1 (n8n) bem-sucedido.');

    console.log('Enviando para Webhook 2 (Secundário)...');
    const response2 = await fetch(WEBHOOK_URL_2, { method: 'POST', body: formData });
    if (!response2.ok) throw new Error(`Erro no Webhook 2 (Secundário): ${response2.statusText}`);
    console.log('Envio para Webhook 2 (Secundário) bem-sucedido.');

    const responseJson = await response2.json();
    const data = responseJson[0];
    const outputHtml = data?.resumo || "Não foi possível gerar o resumo do playbook.";
    const base64File = data?.arquivo || null;
    let pdfUrl = null;

    if (base64File) {
      try {
        const cleanBase64 = base64File.replace(/\s/g, '');
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = Array.from(byteCharacters, c => c.charCodeAt(0));
        const byteArray = new Uint8Array(byteNumbers);
        const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
        pdfUrl = URL.createObjectURL(pdfBlob);
        const nomeEmpresaInput = formData.get("EMPRESA_NOME");
        const nomeEmpresa = nomeEmpresaInput && String(nomeEmpresaInput).trim() !== "" ? nomeEmpresaInput : "Playbook";
        const safeName = nomeEmpresa.replace(/\s+/g, "_");
        const fileName = `${safeName} - Playbook.pdf`;
        const pdfMockup = document.querySelector('.pdf-mockup-box .file-msg');
        const pdfSubMsg = document.querySelector('.pdf-mockup-box .file-sub-msg');
        if (pdfMockup && pdfSubMsg) {
          pdfMockup.innerHTML =
            `<a href="${pdfUrl}" download="${fileName}" target="_blank"
            style="color: var(--primary); text-decoration: none;">${fileName}</a>`;
          pdfSubMsg.textContent = "Clique para baixar o PDF";
        }
      } catch (err) {
        console.error("Erro ao converter Base64 do PDF:", err);
        const pdfSubMsg = document.querySelector('.pdf-mockup-box .file-sub-msg');
        if (pdfSubMsg) pdfSubMsg.textContent = "Erro ao processar o arquivo PDF.";
      }
    } else {
      console.warn("Nenhum arquivo PDF Base64 encontrado no retorno do webhook.");
      const pdfSubMsg = document.querySelector('.pdf-mockup-box .file-sub-msg');
      if (pdfSubMsg) pdfSubMsg.textContent = "PDF não gerado ou não retornado pelo servidor.";
    }

    console.log(outputHtml)
    document.getElementById('ai_feedback_playbook_content_success').innerHTML = outputHtml;
    hideLoading();
    showSuccessScreen(form);

  } catch (error) {
    console.error('Erro na submissão (fetch):', error);
    alert("❌ Erro! Não foi possível enviar os dados.");
    hideLoading();
  }
}

// ================= TELA DE SUCESSO =================
function showSuccessScreen(form) {
  document.querySelector('.nav-buttons').style.display = 'none';
  document.querySelector('.progress-container').style.display = 'none';
  document.querySelector('.block-nav-container').style.display = 'none';
  document.querySelector('.step.active').classList.remove('active');
  document.querySelector('.step[data-step="success"]').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
