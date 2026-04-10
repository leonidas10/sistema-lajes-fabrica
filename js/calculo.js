/**
 * SISTEMA DE ORÇAMENTO DE LAJES — calculo.js
 * Versão: 1.0
 * Uso: Sistema interno de fábrica (local)
 *
 * Responsabilidades:
 *  - Controle de login local (sem back-end)
 *  - Cálculo de área (regular e irregular)
 *  - Cálculo de orçamento com margem e frete
 *  - Estimativa técnica (enchimento e concreto)
 *  - Geração de PDF via html2pdf.js (carregado sob demanda)
 */

'use strict';

/* ============================================================
   CONFIGURAÇÃO — CREDENCIAIS LOCAIS
   Altere aqui para adicionar ou editar usuários.
   Para o futuro back-end, remova este objeto e implemente
   autenticação via API.
   ============================================================ */
const USUARIOS = [
  { usuario: 'admin',      senha: 'lajes2024',   nome: 'Administrador',   perfil: 'admin'     },
  { usuario: 'fabrica',    senha: 'fabrica123',  nome: 'Operador Fábrica', perfil: 'producao' },
  { usuario: 'comercial',  senha: 'venda123',    nome: 'Comercial',        perfil: 'comercial' },
];

/* ============================================================
   CONSTANTES TÉCNICAS
   ============================================================ */
const TECH = {
  // Qtd de peças de enchimento por m²
  EPS_POR_M2:      6.25,   // Isopor 40x40cm → ~6,25 un/m²
  CERAMICA_POR_M2: 8.33,   // Cerâmica 30x40cm → ~8,33 un/m²

  // Volume de concreto por m² conforme tipo de laje
  CONCRETO_H8:     0.042,  // m³/m²
  CONCRETO_H12:    0.058,  // m³/m²
};

/* ============================================================
   ESTADO DA APLICAÇÃO
   ============================================================ */
const estado = {
  formato:     'regular',
  enchimento:  'eps',
  tipoLaje:    'H8',
  logado:      false,
  usuarioNome: '',
  usuarioPerfil: '',
  ultimoCalculo: null,
};

/* ============================================================
   UTILITÁRIOS
   ============================================================ */

/** Formata número como moeda BRL */
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata número com casas decimais */
function formatarNumero(valor, decimais = 2) {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });
}

/** Lê um input numérico com segurança (retorna NaN se vazio/inválido) */
function lerNumero(id) {
  const el = document.getElementById(id);
  if (!el) return NaN;
  const v = parseFloat(el.value);
  return isNaN(v) ? NaN : v;
}

/** Mostra/oculta elemento */
function mostrar(id)  { document.getElementById(id)?.classList.remove('oculto'); }
function ocultar(id)  { document.getElementById(id)?.classList.add('oculto'); }

/** Define texto de um elemento */
function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

/** Data e hora formatadas */
function dataAtual() {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ============================================================
   LOGIN
   ============================================================ */
function inicializarLogin() {
  const formLogin     = document.getElementById('form-login');
  const btnAbrir      = document.getElementById('btn-abrir-login');
  const btnHero       = document.getElementById('btn-visao-geral');
  const btnFechar     = document.getElementById('btn-fechar-login');
  const overlay       = document.getElementById('modal-overlay');
  const toggleSenha   = document.getElementById('toggle-senha');
  const inputSenha    = document.getElementById('senha-login');
  const inputUsuario  = document.getElementById('usuario-login');
  const lembrarMe     = document.getElementById('lembrar-me');

  // Restaura usuário salvo
  const usuarioSalvo = localStorage.getItem('lajes_usuario');
  if (usuarioSalvo && inputUsuario) {
    inputUsuario.value = usuarioSalvo;
    if (lembrarMe) lembrarMe.checked = true;
  }

  // Abre modal de login
  function abrirModal() {
    mostrar('modal-overlay');
    overlay.classList.remove('oculto');
    setTimeout(() => inputUsuario?.focus(), 100);
  }

  btnAbrir?.addEventListener('click', abrirModal);

  // Botão "Visão Geral do ERP" — abre modal ERP
  const btnErp        = document.getElementById('btn-visao-geral');
  const overlayErp    = document.getElementById('modal-erp');
  const btnFecharErp  = document.getElementById('btn-fechar-erp');
  const btnErpLogin   = document.getElementById('btn-erp-ir-login');

  function abrirModalErp() {
    mostrar('modal-erp');
    overlayErp?.classList.remove('oculto');
  }
  function fecharModalErp() {
    ocultar('modal-erp');
  }

  btnErp?.addEventListener('click', abrirModalErp);
  btnFecharErp?.addEventListener('click', fecharModalErp);
  overlayErp?.addEventListener('click', (e) => { if (e.target === overlayErp) fecharModalErp(); });
  btnErpLogin?.addEventListener('click', () => { fecharModalErp(); abrirModal(); });

  // Fecha modal
  function fecharModal() {
    ocultar('modal-overlay');
    limparAlertas();
  }

  btnFechar?.addEventListener('click', fecharModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) fecharModal();
  });

  // ESC fecha modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
  });

  // Toggle visibilidade da senha
  toggleSenha?.addEventListener('click', () => {
    const visivel = inputSenha.type === 'text';
    inputSenha.type = visivel ? 'password' : 'text';
    toggleSenha.innerHTML = visivel
      ? '<i class="fas fa-eye"></i>'
      : '<i class="fas fa-eye-slash"></i>';
  });

  // Submit do formulário
  formLogin?.addEventListener('submit', (e) => {
    e.preventDefault();
    realizarLogin();
  });
}

function limparAlertas() {
  setTexto('erro-usuario', '');
  setTexto('erro-senha', '');
  ocultar('alerta-login');
}

function realizarLogin() {
  limparAlertas();

  const usuarioInput  = document.getElementById('usuario-login');
  const senhaInput    = document.getElementById('senha-login');
  const lembrarMe     = document.getElementById('lembrar-me');

  const usuario = usuarioInput?.value.trim();
  const senha   = senhaInput?.value;

  // Validação básica de campos
  let valido = true;

  if (!usuario) {
    setTexto('erro-usuario', 'Informe o usuário.');
    valido = false;
  }
  if (!senha) {
    setTexto('erro-senha', 'Informe a senha.');
    valido = false;
  }
  if (!valido) return;

  // Verifica credenciais
  const encontrado = USUARIOS.find(
    (u) => u.usuario === usuario && u.senha === senha
  );

  if (!encontrado) {
    mostrar('alerta-login');
    setTexto('mensagem-alerta', 'Usuário ou senha inválidos. Tente novamente.');
    senhaInput.value = '';
    senhaInput.focus();
    return;
  }

  // Login OK
  estado.logado        = true;
  estado.usuarioNome   = encontrado.nome;
  estado.usuarioPerfil = encontrado.perfil || 'producao';

  if (lembrarMe?.checked) {
    localStorage.setItem('lajes_usuario', usuario);
  } else {
    localStorage.removeItem('lajes_usuario');
  }

  entrarNoSistema(encontrado.nome, encontrado.perfil);
}

function entrarNoSistema(nome, perfil) {
  ocultar('modal-overlay');
  ocultar('tela-login');
  mostrar('tela-sistema');
  setTexto('nome-usuario-logado', nome || estado.usuarioNome);

  // Exibe badge de perfil
  const badgeEl = document.getElementById('badge-perfil-usuario');
  if (badgeEl) {
    const p = perfil || estado.usuarioPerfil || 'producao';
    const labels = { admin: 'ADMIN', producao: 'PROD', comercial: 'COM' };
    const classes = { admin: 'badge-admin', producao: 'badge-producao', comercial: 'badge-comercial' };
    badgeEl.textContent = labels[p] || p.toUpperCase();
    badgeEl.className = `erp-badge ${classes[p] || ''}`;
  }
}

function sair() {
  estado.logado         = false;
  estado.usuarioNome    = '';
  estado.usuarioPerfil  = '';
  estado.ultimoCalculo  = null;

  // Limpa campos
  document.getElementById('usuario-login')?.setAttribute('value', '');
  document.getElementById('senha-login') && (document.getElementById('senha-login').value = '');

  ocultar('tela-sistema');
  ocultar('resultados');
  mostrar('tela-login');
}

/* ============================================================
   CONTROLES DE SEGMENTAÇÃO
   ============================================================ */
function inicializarControles() {

  // Tipo de Laje
  document.querySelectorAll('[data-tipo-laje]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tipo-laje]').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      estado.tipoLaje = btn.dataset.tipoLaje;
    });
  });

  // Formato da área
  document.querySelectorAll('[data-formato]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-formato]').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      estado.formato = btn.dataset.formato;
      alternarCamposDimensao();
    });
  });

  // Tipo de enchimento
  document.querySelectorAll('[data-enchimento]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-enchimento]').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      estado.enchimento = btn.dataset.enchimento;
    });
  });
}

function alternarCamposDimensao() {
  if (estado.formato === 'regular') {
    mostrar('campos-regular');
    ocultar('campos-irregular');
  } else {
    ocultar('campos-regular');
    mostrar('campos-irregular');
  }
  ocultar('alerta-campos');
}

/* ============================================================
   CÁLCULO
   ============================================================ */
function calcularOrcamento() {
  ocultar('alerta-campos');

  /* --- Lê configurações financeiras --- */
  const precoM2    = lerNumero('precoM2');
  const frete      = lerNumero('freteKM');
  const margem     = lerNumero('margemLucro');

  if (isNaN(precoM2) || precoM2 <= 0) {
    mostrarAlertaCampos('O custo de produção por m² deve ser maior que zero.');
    return;
  }
  if (isNaN(frete) || frete < 0) {
    mostrarAlertaCampos('O valor do frete não pode ser negativo.');
    return;
  }
  if (isNaN(margem) || margem < 0 || margem > 100) {
    mostrarAlertaCampos('A margem de lucro deve estar entre 0% e 100%.');
    return;
  }

  /* --- Calcula área --- */
  let area = 0;
  let formatoTexto = '';

  if (estado.formato === 'regular') {
    const largura     = lerNumero('larguraVao');
    const comprimento = lerNumero('comprimentoVao');

    if (isNaN(largura) || largura <= 0 || isNaN(comprimento) || comprimento <= 0) {
      mostrarAlertaCampos('Informe a largura e o comprimento do vão (valores positivos).');
      return;
    }

    area = largura * comprimento;
    formatoTexto = `Regular ${formatarNumero(largura)} × ${formatarNumero(comprimento)} m`;

  } else {
    // Área irregular — trapézio composto
    // A = ((frente + fundo) / 2) × ((ladoEsq + ladoDir) / 2)
    const frente   = lerNumero('larguraFrente');
    const fundo    = lerNumero('larguraFundo');
    const ladoEsq  = lerNumero('compEsq');
    const ladoDir  = lerNumero('compDir');

    if ([frente, fundo, ladoEsq, ladoDir].some((v) => isNaN(v) || v <= 0)) {
      mostrarAlertaCampos('Informe todos os 4 lados do vão irregular (valores positivos).');
      return;
    }

    const mediaLargura    = (frente + fundo) / 2;
    const mediaComprimento = (ladoEsq + ladoDir) / 2;
    area = mediaLargura * mediaComprimento;
    formatoTexto = `Irregular — Frente: ${formatarNumero(frente)}m, Fundo: ${formatarNumero(fundo)}m, Esq: ${formatarNumero(ladoEsq)}m, Dir: ${formatarNumero(ladoDir)}m`;
  }

  /* --- Cálculo financeiro --- */
  const custoFabrica   = area * precoM2;
  const precoVenda     = custoFabrica * (1 + margem / 100);
  const precoFinal     = precoVenda + frete;
  const precoM2Venda   = area > 0 ? precoFinal / area : 0;

  /* --- Detalhes técnicos --- */
  const fatorEnchimento = estado.enchimento === 'eps'
    ? TECH.EPS_POR_M2
    : TECH.CERAMICA_POR_M2;

  const qtdEnchimento = Math.ceil(area * fatorEnchimento);
  const volumeConcreto = area * (estado.tipoLaje === 'H8' ? TECH.CONCRETO_H8 : TECH.CONCRETO_H12);

  const enchimentoTexto = estado.enchimento === 'eps' ? 'EPS (Isopor)' : 'Cerâmica';
  const nomeCliente = document.getElementById('nomeCliente')?.value.trim() || '';

  /* --- Salva resultado no estado --- */
  estado.ultimoCalculo = {
    area, custoFabrica, precoVenda, precoFinal,
    frete, margem, precoM2, precoM2Venda,
    qtdEnchimento, volumeConcreto,
    enchimentoTexto, formatoTexto,
    tipoLaje: estado.tipoLaje,
    nomeCliente,
    data: dataAtual(),
  };

  /* --- Atualiza UI --- */
  exibirResultados(estado.ultimoCalculo);
}

function mostrarAlertaCampos(msg) {
  setTexto('msg-alerta-campos', msg);
  mostrar('alerta-campos');
  document.getElementById('alerta-campos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function exibirResultados(c) {
  // Cards principais
  setTexto('res-area',           `${formatarNumero(c.area)} m²`);
  setTexto('res-custo-producao', formatarMoeda(c.custoFabrica));
  setTexto('res-custo-venda',    formatarMoeda(c.precoVenda));
  setTexto('res-preco-final',    formatarMoeda(c.precoFinal));

  // Subinfo do total
  setTexto('total-subinfo',
    `${formatarNumero(c.area)} m² × ${formatarMoeda(c.precoM2Venda)}/m²` +
    (c.frete > 0 ? ` + ${formatarMoeda(c.frete)} frete` : '')
  );

  // Data
  setTexto('data-orcamento', c.data);

  // Detalhes técnicos
  setTexto('det-tipo-laje',       `Laje ${c.tipoLaje}`);
  setTexto('det-enchimento',      c.enchimentoTexto);
  setTexto('det-qtd-enchimento',  `${c.qtdEnchimento} un`);
  setTexto('det-concreto',        `${formatarNumero(c.volumeConcreto, 3)} m³`);
  setTexto('det-formato',         c.formatoTexto.split('—')[0].trim());
  setTexto('det-preco-m2',        `${formatarMoeda(c.precoM2Venda)}/m²`);

  // Cliente (opcional)
  if (c.nomeCliente) {
    setTexto('cliente-resultado-nome', c.nomeCliente);
    mostrar('cliente-resultado');
  } else {
    ocultar('cliente-resultado');
  }

  // Exibe seção de resultados
  mostrar('resultados');
  document.getElementById('resultados')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   LIMPAR FORMULÁRIO
   ============================================================ */
function limparFormulario() {
  // Inputs numéricos de dimensão
  ['larguraVao','comprimentoVao','larguraFrente','larguraFundo','compEsq','compDir','nomeCliente'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  ocultar('resultados');
  ocultar('alerta-campos');
  estado.ultimoCalculo = null;

  // Volta para formato regular
  document.querySelectorAll('[data-formato]').forEach((b) => b.classList.remove('ativo'));
  document.querySelector('[data-formato="regular"]')?.classList.add('ativo');
  estado.formato = 'regular';
  alternarCamposDimensao();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   GERAÇÃO DE PDF (carregado sob demanda)
   ============================================================ */
function gerarPDF() {
  if (!estado.ultimoCalculo) return;
  const c = estado.ultimoCalculo;

  // Carrega html2pdf apenas quando necessário
  function executarPDF() {
    const conteudo = document.getElementById('conteudo-pdf');

    conteudo.innerHTML = `
      <div style="font-family: 'IBM Plex Sans', Arial, sans-serif; padding: 32px; color: #1a1a2e; max-width: 680px; margin: 0 auto;">
        
        <div style="display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #f97316; padding-bottom: 16px; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.6rem; font-weight: 700; letter-spacing: 2px; color: #0d0f14; margin: 0;">ORÇAMENTO DE LAJES</h1>
            <p style="font-size: 0.78rem; color: #666; margin: 4px 0 0; letter-spacing: 1px;">FÁBRICA DE LAJES — BETIM, MG</p>
          </div>
          <div style="text-align:right;">
            <p style="font-size: 0.75rem; color: #666;">Emitido em</p>
            <p style="font-size: 0.85rem; font-weight: 600;">${c.data}</p>
          </div>
        </div>

        ${c.nomeCliente ? `
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
          <p style="font-size: 0.78rem; color: #92400e; font-weight: 700; letter-spacing: 1px; margin-bottom: 2px;">CLIENTE / OBRA</p>
          <p style="font-size: 0.95rem; color: #c2410c; font-weight: 600;">${c.nomeCliente}</p>
        </div>` : ''}

        <table style="width:100%; border-collapse:collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th colspan="2" style="text-align:left; padding: 10px 14px; font-size: 0.78rem; letter-spacing: 1.5px; color: #475569; text-transform: uppercase;">RESUMO FINANCEIRO</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['Área Total', `${formatarNumero(c.area)} m²`],
              ['Custo de Produção (Fábrica)', formatarMoeda(c.custoFabrica)],
              [`Preço de Venda (margem ${c.margem}%)`, formatarMoeda(c.precoVenda)],
              ['Frete', formatarMoeda(c.frete)],
            ].map(([k, v], i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-size: 0.88rem; color: #374151;">${k}</td>
                <td style="padding: 10px 14px; font-size: 0.88rem; font-weight: 600; text-align:right; color: #1e293b;">${v}</td>
              </tr>
            `).join('')}
            <tr style="background: #fff7ed;">
              <td style="padding: 14px; font-size: 1rem; font-weight: 700; color: #c2410c;">TOTAL FINAL</td>
              <td style="padding: 14px; font-size: 1.1rem; font-weight: 700; text-align:right; color: #ea580c;">${formatarMoeda(c.precoFinal)}</td>
            </tr>
          </tbody>
        </table>

        <table style="width:100%; border-collapse:collapse; margin-bottom: 32px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th colspan="2" style="text-align:left; padding: 10px 14px; font-size: 0.78rem; letter-spacing: 1.5px; color: #475569; text-transform: uppercase;">DETALHES TÉCNICOS</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['Tipo de Laje',      `Laje ${c.tipoLaje}`],
              ['Formato',           c.formatoTexto],
              ['Tipo de Enchimento', c.enchimentoTexto],
              ['Qtd. Enchimento',   `${c.qtdEnchimento} unidades`],
              ['Volume de Concreto', `${formatarNumero(c.volumeConcreto, 3)} m³`],
              ['Preço por m²',       formatarMoeda(c.precoM2Venda)],
            ].map(([k, v], i) => `
              <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-size: 0.85rem; color: #374151;">${k}</td>
                <td style="padding: 10px 14px; font-size: 0.85rem; font-weight: 600; text-align:right; color: #1e293b;">${v}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center;">
          <p style="font-size: 0.72rem; color: #94a3b8; letter-spacing: 1px;">
            Documento gerado automaticamente pelo Sistema de Orçamento de Lajes v1.0 — Uso Interno
          </p>
        </div>
      </div>
    `;

    conteudo.style.display = 'block';

    const nomeArquivo = c.nomeCliente
      ? `orcamento_${c.nomeCliente.replace(/\s+/g, '_').toLowerCase()}.pdf`
      : `orcamento_lajes_${new Date().toISOString().slice(0,10)}.pdf`;

    const opcoes = {
      margin:       [8, 8, 8, 8],
      filename:     nomeArquivo,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf()
      .from(conteudo)
      .set(opcoes)
      .save()
      .then(() => {
        conteudo.style.display = 'none';
      });
  }

  // Carrega html2pdf sob demanda
  if (typeof html2pdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = executarPDF;
    script.onerror = () => alert('Não foi possível carregar o gerador de PDF. Verifique a conexão.');
    document.head.appendChild(script);
  } else {
    executarPDF();
  }
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  inicializarLogin();
  inicializarControles();

  // Botão calcular
  document.getElementById('btn-calcular')
    ?.addEventListener('click', calcularOrcamento);

  // Botão limpar
  document.getElementById('btn-limpar')
    ?.addEventListener('click', limparFormulario);

  // Botão PDF
  document.getElementById('btn-pdf')
    ?.addEventListener('click', gerarPDF);

  // Botão novo cálculo
  document.getElementById('btn-novo-calculo')
    ?.addEventListener('click', limparFormulario);

  // Botão sair
  document.getElementById('btn-logout')
    ?.addEventListener('click', sair);

  // Permite calcular com Enter nos campos de dimensão
  ['larguraVao','comprimentoVao','larguraFrente','larguraFundo','compEsq','compDir'].forEach((id) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') calcularOrcamento();
    });
  });
});
