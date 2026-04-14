/**
 * SISTEMA DE ORÇAMENTO DE LAJES — calculo.js
 * Versão: 1.4.0
 * Uso: Sistema interno de fábrica (local)
 */

// 🔥 FIREBASE (TOPO DO ARQUIVO)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  addDoc,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQq4IFMw4YPM3FglF3kynFZ4dxjTvBMzo",
  authDomain: "trelisys-bd4f4.firebaseapp.com",
  projectId: "trelisys-bd4f4",
  storageBucket: "trelisys-bd4f4.firebasestorage.app",
  messagingSenderId: "34918837379",
  appId: "1:34918837379:web:988ab6f2caeb72a6867fb6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

'use strict';

const VERSAO_SISTEMA = '1.4.1';

/* ============================================================
   CONFIGURAÇÃO — CREDENCIAIS LOCAIS
   ============================================================ */
const USUARIOS = [
  { usuario: 'admin', senha: 'lajes2024', nome: 'Administrador', perfil: 'admin' },
  { usuario: 'fabrica', senha: 'fabrica123', nome: 'Operador Fábrica', perfil: 'producao' },
  { usuario: 'comercial', senha: 'venda123', nome: 'Comercial', perfil: 'comercial' },
];

/* ============================================================
   CONSTANTES TÉCNICAS
   ============================================================ */
const TECH = {
  CERAMICA_POR_M2: 8.33,
  CONCRETO_H8: 0.042,
  CONCRETO_H12: 0.058,
  ESPACAMENTO_TRELICA: 0.40,
};

/* ============================================================
   ESTADO DA APLICAÇÃO
   ============================================================ */
const estado = {
  formato: 'regular',
  enchimento: 'eps',
  tipoLaje: 'H8',
  logado: false,
  usuarioNome: '',
  usuarioPerfil: '',
  ultimoCalculo: null,
};

let historicoCarregado = false;

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatarNumero(valor, decimais = 2) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });
}

function atualizarVersaoSistema() {
  setTexto('versao-hero', `Sistema Interno v${VERSAO_SISTEMA}`);
  setTexto('versao-menu', `Versão ${VERSAO_SISTEMA} — lajes treliçadas H8 e H12.`);
  setTexto('versao-modulo-ativo', `Ativo — Motor v${VERSAO_SISTEMA}`);

  const versaoErp = document.getElementById('versao-erp');
  if (versaoErp) {
    versaoErp.innerHTML = `<i class="fas fa-code-branch"></i> Versão atual: <strong>${VERSAO_SISTEMA}</strong> — Motor de Orçamentos`;
  }

  setTexto('versao-card', `Motor v${VERSAO_SISTEMA}`);
  setTexto('versao-footer', `Sistema de Orçamento de Lajes v${VERSAO_SISTEMA} — Uso Interno`);
}

function lerNumero(id) {
  const el = document.getElementById(id);
  if (!el) return NaN;

  const texto = String(el.value).replace(',', '.').trim();
  if (texto === '') return NaN;

  const valor = parseFloat(texto);
  return Number.isNaN(valor) ? NaN : valor;
}

function mostrar(id) {
  document.getElementById(id)?.classList.remove('oculto');
}

function ocultar(id) {
  document.getElementById(id)?.classList.add('oculto');
}

function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function setValor(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor;
}

function dataAtual() {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function carregarImagemComoBase64(caminho) {
  return fetch(caminho)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Não foi possível carregar a imagem: ${caminho}`);
      }
      return res.blob();
    })
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
}

function limparCamposTrelica() {
  setValor('quantidadeTrelicas', '0');
  setValor('comprimentoTrelica', '0,00');
  setValor('totalMetrosTrelica', '0,00');
}

function atualizarCamposTrelica(quantidadeTrelicas, comprimentoCadaTrelica, metrosLinearesTrelica) {
  setValor('quantidadeTrelicas', String(quantidadeTrelicas));
  setValor('comprimentoTrelica', formatarNumero(comprimentoCadaTrelica));
  setValor('totalMetrosTrelica', formatarNumero(metrosLinearesTrelica));
}

function calcularDadosEPS() {
  const comprimentoEPS = lerNumero('comprimentoEPS');
  const larguraEPS = lerNumero('larguraEPS');
  const perdaEPS = lerNumero('perdaEPS');

  if (
    isNaN(comprimentoEPS) || comprimentoEPS <= 0 ||
    isNaN(larguraEPS) || larguraEPS <= 0
  ) {
    setValor('areaPecaEPS', '0,00');
    setValor('pecasPorM2EPS', '0,00');

    return {
      areaPecaEPS: 0,
      pecasPorM2EPS: 0,
      perdaEPS: 0,
    };
  }

  const areaPecaEPS = comprimentoEPS * larguraEPS;
  const pecasPorM2EPS = areaPecaEPS > 0 ? 1 / areaPecaEPS : 0;
  const perdaNormalizada = !isNaN(perdaEPS) && perdaEPS >= 0 ? perdaEPS : 0;

  setValor('areaPecaEPS', formatarNumero(areaPecaEPS, 3));
  setValor('pecasPorM2EPS', formatarNumero(pecasPorM2EPS, 2));

  return {
    areaPecaEPS,
    pecasPorM2EPS,
    perdaEPS: perdaNormalizada,
  };
}

/* ============================================================
   LOGIN
   ============================================================ */
function inicializarLogin() {
  const formLogin = document.getElementById('form-login');
  const btnAbrir = document.getElementById('btn-abrir-login');
  const btnFechar = document.getElementById('btn-fechar-login');
  const overlay = document.getElementById('modal-overlay');
  const toggleSenha = document.getElementById('toggle-senha');
  const inputSenha = document.getElementById('senha-login');
  const inputUsuario = document.getElementById('usuario-login');
  const lembrarMe = document.getElementById('lembrar-me');

  const usuarioSalvo = localStorage.getItem('lajes_usuario');
  if (usuarioSalvo && inputUsuario) {
    inputUsuario.value = usuarioSalvo;
    if (lembrarMe) lembrarMe.checked = true;
  }

  function abrirModal() {
    mostrar('modal-overlay');
    overlay?.classList.remove('oculto');
    setTimeout(() => inputUsuario?.focus(), 100);
  }

  function fecharModal() {
    ocultar('modal-overlay');
    limparAlertas();
  }

  btnAbrir?.addEventListener('click', abrirModal);
  btnFechar?.addEventListener('click', fecharModal);

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) fecharModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharModal();
      fecharModalErp();
    }
  });

  toggleSenha?.addEventListener('click', () => {
    if (!inputSenha) return;

    const visivel = inputSenha.type === 'text';
    inputSenha.type = visivel ? 'password' : 'text';
    toggleSenha.innerHTML = visivel
      ? '<i class="fas fa-eye"></i>'
      : '<i class="fas fa-eye-slash"></i>';
  });

  formLogin?.addEventListener('submit', (e) => {
    e.preventDefault();
    realizarLogin();
  });

  const btnErp = document.getElementById('btn-visao-geral');
  const overlayErp = document.getElementById('modal-erp');
  const btnFecharErp = document.getElementById('btn-fechar-erp');
  const btnErpLogin = document.getElementById('btn-erp-ir-login');

  function abrirModalErp() {
    mostrar('modal-erp');
    overlayErp?.classList.remove('oculto');
  }

  btnErp?.addEventListener('click', abrirModalErp);
  btnFecharErp?.addEventListener('click', fecharModalErp);

  overlayErp?.addEventListener('click', (e) => {
    if (e.target === overlayErp) fecharModalErp();
  });

  btnErpLogin?.addEventListener('click', () => {
    fecharModalErp();
    abrirModal();
  });
}

function fecharModalErp() {
  ocultar('modal-erp');
}

function limparAlertas() {
  setTexto('erro-usuario', '');
  setTexto('erro-senha', '');
  ocultar('alerta-login');
}

function realizarLogin() {
  limparAlertas();

  const usuarioInput = document.getElementById('usuario-login');
  const senhaInput = document.getElementById('senha-login');
  const lembrarMe = document.getElementById('lembrar-me');

  const usuario = usuarioInput?.value.trim();
  const senha = senhaInput?.value;

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

  const encontrado = USUARIOS.find((u) => u.usuario === usuario && u.senha === senha);

  if (!encontrado) {
    mostrar('alerta-login');
    setTexto('mensagem-alerta', 'Usuário ou senha inválidos. Tente novamente.');
    if (senhaInput) {
      senhaInput.value = '';
      senhaInput.focus();
    }
    return;
  }

  estado.logado = true;
  estado.usuarioNome = encontrado.nome;
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

  const badgeEl = document.getElementById('badge-perfil-usuario');
  if (badgeEl) {
    const p = perfil || estado.usuarioPerfil || 'producao';
    const labels = { admin: 'ADMIN', producao: 'PROD', comercial: 'COM' };
    const classes = {
      admin: 'badge-admin',
      producao: 'badge-producao',
      comercial: 'badge-comercial',
    };

    badgeEl.textContent = labels[p] || p.toUpperCase();
    badgeEl.className = `erp-badge ${classes[p] || ''}`;
  }
}

function sair() {
  estado.logado = false;
  estado.usuarioNome = '';
  estado.usuarioPerfil = '';
  estado.ultimoCalculo = null;
  historicoCarregado = false;

  const usuarioLogin = document.getElementById('usuario-login');
  const senhaLogin = document.getElementById('senha-login');

  if (usuarioLogin) usuarioLogin.value = '';
  if (senhaLogin) senhaLogin.value = '';

  ocultar('tela-sistema');
  ocultar('resultados');
  ocultar('historico');
  mostrar('tela-login');
}

/* ============================================================
   CONTROLES DE SEGMENTAÇÃO
   ============================================================ */
function inicializarControles() {
  document.querySelectorAll('[data-tipo-laje]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tipo-laje]').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      estado.tipoLaje = btn.dataset.tipoLaje;
    });
  });

  document.querySelectorAll('[data-formato]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-formato]').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      estado.formato = btn.dataset.formato;
      alternarCamposDimensao();
    });
  });

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
  limparCamposTrelica();
}

/* ============================================================
   CÁLCULO
   ============================================================ */
function calcularOrcamento() {
  ocultar('alerta-campos');

  const precoM2 = lerNumero('precoM2');
  const frete = lerNumero('freteKM');
  const margem = lerNumero('margemLucro');
  const precoEPS = lerNumero('precoEPS');
  const precoCeramica = lerNumero('precoCeramica');
  const valorMetroTrelica = lerNumero('valorMetroTrelica');

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

  if (isNaN(precoEPS) || precoEPS < 0) {
    mostrarAlertaCampos('Informe um valor válido para o preço do EPS.');
    return;
  }

  if (isNaN(precoCeramica) || precoCeramica < 0) {
    mostrarAlertaCampos('Informe um valor válido para o preço da lajota cerâmica.');
    return;
  }

  if (isNaN(valorMetroTrelica) || valorMetroTrelica < 0) {
    mostrarAlertaCampos('Informe um valor válido para o metro linear da treliça.');
    return;
  }

  let area = 0;
  let formatoTexto = '';
  let larguraBase = 0;
  let comprimentoBase = 0;

  if (estado.formato === 'regular') {
    const largura = lerNumero('larguraVao');
    const comprimento = lerNumero('comprimentoVao');

    if (isNaN(largura) || largura <= 0 || isNaN(comprimento) || comprimento <= 0) {
      mostrarAlertaCampos('Informe a largura e o comprimento do vão.');
      return;
    }

    larguraBase = largura;
    comprimentoBase = comprimento;
    area = largura * comprimento;
    formatoTexto = `Regular ${formatarNumero(largura)} × ${formatarNumero(comprimento)} m`;
  } else {
    const frente = lerNumero('larguraFrente');
    const fundo = lerNumero('larguraFundo');
    const ladoEsq = lerNumero('compEsq');
    const ladoDir = lerNumero('compDir');

    if ([frente, fundo, ladoEsq, ladoDir].some((v) => isNaN(v) || v <= 0)) {
      mostrarAlertaCampos('Informe todos os lados do vão irregular.');
      return;
    }

    larguraBase = (frente + fundo) / 2;
    comprimentoBase = (ladoEsq + ladoDir) / 2;
    area = larguraBase * comprimentoBase;

    formatoTexto =
      `Irregular — Frente: ${formatarNumero(frente)}m, ` +
      `Fundo: ${formatarNumero(fundo)}m, ` +
      `Esq: ${formatarNumero(ladoEsq)}m, ` +
      `Dir: ${formatarNumero(ladoDir)}m`;
  }

  let fatorEnchimento = 0;
let qtdEnchimentoBase = 0;
let qtdEnchimento = 0;
let areaPecaEPS = 0;
let pecasPorM2EPS = 0;
let perdaEPS = 0;

if (estado.enchimento === 'eps') {
  const dadosEPS = calcularDadosEPS();

  areaPecaEPS = dadosEPS.areaPecaEPS;
  pecasPorM2EPS = dadosEPS.pecasPorM2EPS;
  perdaEPS = dadosEPS.perdaEPS;

  if (pecasPorM2EPS <= 0) {
    mostrarAlertaCampos('Informe comprimento e largura válidos para o EPS.');
    return;
  }

  fatorEnchimento = pecasPorM2EPS;
  qtdEnchimentoBase = area * fatorEnchimento;
  qtdEnchimento = Math.ceil(qtdEnchimentoBase * (1 + perdaEPS / 100));
} else {
  fatorEnchimento = TECH.CERAMICA_POR_M2;
  qtdEnchimentoBase = area * fatorEnchimento;
  qtdEnchimento = Math.ceil(qtdEnchimentoBase);
}

const precoUnitarioEnchimento = estado.enchimento === 'eps'
  ? precoEPS
  : precoCeramica;

const custoEnchimento = qtdEnchimento * precoUnitarioEnchimento;

  const quantidadeTrelicas = Math.ceil(larguraBase / TECH.ESPACAMENTO_TRELICA);
  const comprimentoCadaTrelica = comprimentoBase;
  const metrosLinearesTrelica = quantidadeTrelicas * comprimentoCadaTrelica;
  const custoTrelica = metrosLinearesTrelica * valorMetroTrelica;

  atualizarCamposTrelica(
    quantidadeTrelicas,
    comprimentoCadaTrelica,
    metrosLinearesTrelica
  );

  const custoFabrica = (area * precoM2) + custoEnchimento + custoTrelica;
  const precoVenda = custoFabrica * (1 + margem / 100);
  const precoFinal = precoVenda + frete;
  const precoM2Venda = area > 0 ? precoFinal / area : 0;

  const lucroBruto = precoVenda - custoFabrica;
  const descontoMaximo = lucroBruto * 0.7;
  const precoMinimoSugerido = precoFinal - descontoMaximo;


  const volumeConcreto = area * (
    estado.tipoLaje === 'H8'
      ? TECH.CONCRETO_H8
      : TECH.CONCRETO_H12
  );

  const enchimentoTexto = estado.enchimento === 'eps'
    ? 'EPS (Isopor)'
    : 'Cerâmica';

  const nomeCliente = document.getElementById('nomeCliente')?.value.trim() || '';

  estado.ultimoCalculo = {
    area,
    custoFabrica,
    precoVenda,
    precoFinal,
    frete,
    margem,
    precoM2,
    precoM2Venda,
    qtdEnchimento,
    custoEnchimento,
    precoUnitarioEnchimento,
    valorMetroTrelica,
    quantidadeTrelicas,
    comprimentoCadaTrelica,
    metrosLinearesTrelica,
    custoTrelica,
    volumeConcreto,
    enchimentoTexto,
    formatoTexto,
    lucroBruto,
    descontoMaximo,
    precoMinimoSugerido,
    tipoLaje: estado.tipoLaje,
    nomeCliente,
    data: dataAtual(),
    timestamp: Date.now(),
  };

  historicoCarregado = false;

  salvarOrcamento(estado.ultimoCalculo);
  exibirResultados(estado.ultimoCalculo);
}

function mostrarAlertaCampos(msg) {
  setTexto('msg-alerta-campos', msg);
  mostrar('alerta-campos');
  document.getElementById('alerta-campos')?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}

function exibirResultados(c) {
  setTexto('res-area', `${formatarNumero(c.area)} m²`);
  setTexto('res-custo-producao', formatarMoeda(c.custoFabrica));
  setTexto('res-custo-venda', formatarMoeda(c.precoVenda));
  setTexto('res-preco-final', formatarMoeda(c.precoFinal));
  setTexto('res-lucro-bruto', formatarMoeda(c.lucroBruto || 0));
  setTexto('res-desconto-maximo', formatarMoeda(c.descontoMaximo || 0));
  setTexto('res-preco-minimo', formatarMoeda(c.precoMinimoSugerido || 0));

  setTexto(
    'total-subinfo',
    `${formatarNumero(c.area)} m² × ${formatarMoeda(c.precoM2Venda)}/m²` +
    (c.frete > 0 ? ` + ${formatarMoeda(c.frete)} frete` : '')
  );

  setTexto('data-orcamento', c.data);
  setTexto('det-tipo-laje', `Laje ${c.tipoLaje}`);
  setTexto('det-enchimento', c.enchimentoTexto);
  setTexto('det-qtd-enchimento', `${c.qtdEnchimento} un`);
  setTexto('det-concreto', `${formatarNumero(c.volumeConcreto, 3)} m³`);
  setTexto('det-metros-trelica', `${formatarNumero(c.metrosLinearesTrelica)} m`);
  setTexto('det-custo-trelica', formatarMoeda(c.custoTrelica));
  setTexto('det-formato', c.formatoTexto.split('—')[0].trim());
  setTexto('det-preco-m2', `${formatarMoeda(c.precoM2Venda)}/m²`);

  if (c.nomeCliente) {
    setTexto('cliente-resultado-nome', c.nomeCliente);
    mostrar('cliente-resultado');
  } else {
    ocultar('cliente-resultado');
  }

    if (estado.usuarioPerfil === 'comercial') {
    ocultar('painel-operador');
  } else {
    mostrar('painel-operador');
  }
  mostrar('resultados');
  document.getElementById('resultados')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

/* ============================================================
   LIMPAR FORMULÁRIO
   ============================================================ */
function limparFormulario() {
  [
    'larguraVao',
    'comprimentoVao',
    'larguraFrente',
    'larguraFundo',
    'compEsq',
    'compDir',
    'nomeCliente',
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  setValor('valorMetroTrelica', '0.00');
  limparCamposTrelica();

  ocultar('resultados');
  ocultar('historico');
  ocultar('alerta-campos');

  estado.ultimoCalculo = null;
  historicoCarregado = false;

  document.querySelectorAll('[data-formato]').forEach((b) => b.classList.remove('ativo'));
  document.querySelector('[data-formato="regular"]')?.classList.add('ativo');

  estado.formato = 'regular';
  alternarCamposDimensao();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   GERAÇÃO DE PDF
   ============================================================ */
async function gerarPDF() {
  if (!estado.ultimoCalculo) {
    alert('Faça um cálculo antes de gerar o PDF.');
    return;
  }

  const c = dadosParaCliente(estado.ultimoCalculo);
  const conteudo = document.getElementById('conteudo-pdf');

  if (!conteudo) {
    alert('Área de PDF não encontrada no HTML.');
    return;
  }

  const logoEmpresa = localStorage.getItem('logo_empresa_base64') || '';

  let logoTechTI = '';
  try {
    logoTechTI = await carregarImagemComoBase64('img/log.png');
  } catch (erro) {
    console.warn('Erro ao carregar logo:', erro);
  }

  conteudo.innerHTML = `
    <div style="
      font-family: Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      width: 190mm;
      margin: 0 auto;
      padding: 12mm;
      box-sizing: border-box;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        border-bottom: 3px solid #f97316;
        padding-bottom: 12px;
        margin-bottom: 16px;
      ">
        <div style="flex: 1;">
          ${
            logoEmpresa
              ? `<img src="${logoEmpresa}" alt="Logo da empresa" style="max-height: 60px; max-width: 180px; object-fit: contain; margin-bottom: 10px;">`
              : `<div style="
                  width: 180px;
                  height: 60px;
                  border: 1px dashed #cbd5e1;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #94a3b8;
                  font-size: 12px;
                  margin-bottom: 10px;
                ">LOGO DA EMPRESA</div>`
          }

          <h1 style="
            font-size: 28px;
            margin: 0;
            color: #111827;
            letter-spacing: 1px;
          ">ORÇAMENTO</h1>
        </div>

      <div style="text-align: right; min-width: 160px;">
        <div style="font-size: 12px; color: #6b7280;">Emitido em</div>
        <div style="font-size: 16px; font-weight: bold; color: #111827;">${c.data}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 6px;">
          Sistema v${VERSAO_SISTEMA}
        </div>
       </div>
      </div>

      ${
        c.nomeCliente
          ? `
            <div style="
              background: #fff7ed;
              border: 1px solid #fdba74;
              border-radius: 8px;
              padding: 10px 12px;
              margin-bottom: 16px;
            ">
              <div style="font-size: 12px; font-weight: bold; color: #9a3412; margin-bottom: 4px;">
                CLIENTE / OBRA
              </div>
              <div style="font-size: 15px; color: #7c2d12; font-weight: 600;">
                ${c.nomeCliente}
              </div>
            </div>
          `
          : ''
      }

      <div style="
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 16px;
      ">
        <div style="
          background: #f3f4f6;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: bold;
          color: #374151;
          letter-spacing: 1px;
        ">
          RESUMO FINANCEIRO
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Área Total</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${formatarNumero(c.area)} m²
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Preço de Venda</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${formatarMoeda(c.precoVenda)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Frete</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${formatarMoeda(c.frete)}
            </td>
          </tr>
          <tr style="background: #fff7ed;">
            <td style="padding: 12px; font-size: 15px; font-weight: bold; color: #9a3412;">TOTAL FINAL</td>
            <td style="padding: 12px; text-align: right; font-size: 17px; font-weight: bold; color: #ea580c;">
              ${formatarMoeda(c.precoFinal)}
            </td>
          </tr>
        </table>
      </div>

      <div style="
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 16px;
      ">
        <div style="
          background: #f3f4f6;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: bold;
          color: #374151;
          letter-spacing: 1px;
        ">
          DETALHES TÉCNICOS
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Tipo de Laje</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              Laje ${c.tipoLaje}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Formato</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${c.formatoTexto}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Enchimento</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${c.enchimentoTexto}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Qtd. Enchimento</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${c.qtdEnchimento} unidades
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Qtd. Treliças</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${c.quantidadeTrelicas} unidades
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Comprimento de Cada Treliça</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${formatarNumero(c.comprimentoCadaTrelica)} m
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Total Metros Lineares</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${formatarNumero(c.metrosLinearesTrelica)} m
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Custo da Treliça</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${formatarMoeda(c.custoTrelica)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Volume de Concreto</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
              ${formatarNumero(c.volumeConcreto, 3)} m³
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px;">Preço por m²</td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 600;">
              ${formatarMoeda(c.precoM2Venda)}
            </td>
          </tr>
        </table>
      </div>

      <div style="
        border-top: 1px solid #e5e7eb;
        margin-top: 18px;
        padding-top: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        font-size: 11px;
        color: #6b7280;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          ${
            logoTechTI
              ? `<img
                  src="${logoTechTI}"
                  alt="@Tech TI"
                  style="
                    width: 38px;
                    height: 38px;
                    object-fit: contain;
                    border-radius: 8px;
                    flex-shrink: 0;
                  "
                >`
              : `<div style="
                  width: 38px;
                  height: 38px;
                  background: #111827;
                  color: white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 8px;
                  font-size: 10px;
                  font-weight: bold;
                  flex-shrink: 0;
                ">TI</div>`
          }

          <div>
            <div style="
              font-size: 12px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 2px;
            ">
              @Tech TI
            </div>
            <div style="font-size: 10px; color: #6b7280;">
              Soluções em TI
            </div>
          </div>
        </div>

        <div style="
          text-align: right;
          font-size: 10px;
          line-height: 1.5;
          color: #6b7280;
        ">
          <div>Telefone: (31) 99684-8157</div>
          <div>E-mail: leonidas.paulino@hotmail.com</div>
        </div>
      </div>
    </div>
  `;

  conteudo.style.display = 'block';

  const nomeArquivo = c.nomeCliente
    ? `orcamento_${c.nomeCliente.replace(/\s+/g, '_').toLowerCase()}.pdf`
    : `orcamento_${new Date().toISOString().slice(0, 10)}.pdf`;

  const opcoes = {
    margin: 0,
    filename: nomeArquivo,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: {
      mode: ['css', 'legacy'],
    },
  };

  function executarPDF() {
    html2pdf()
      .set(opcoes)
      .from(conteudo)
      .save()
      .then(() => {
        conteudo.style.display = 'none';
      });
  }

  if (typeof html2pdf === 'undefined') {
  alert('Erro: biblioteca de PDF não carregada.');
  return;
}

 executarPDF();
}

function inicializarLogoEmpresa() {
  const inputLogo = document.getElementById('logoEmpresa');
  const previewWrap = document.getElementById('preview-logo-wrap');
  const previewImg = document.getElementById('preview-logo');

  const logoSalva = localStorage.getItem('logo_empresa_base64');
  if (logoSalva && previewWrap && previewImg) {
    previewImg.src = logoSalva;
    previewWrap.style.display = 'block';
  }

  inputLogo?.addEventListener('change', (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result;
      localStorage.setItem('logo_empresa_base64', base64);

      if (previewImg && previewWrap) {
        previewImg.src = base64;
        previewWrap.style.display = 'block';
      }
    };

    reader.readAsDataURL(arquivo);
  });
}

/* ============================================================
   HISTÓRICO / CLIENTE
   ============================================================ */
async function carregarHistorico() {
  const lista = document.getElementById('lista-historico');
  if (!lista) return;

  lista.innerHTML = '<p>Carregando histórico...</p>';

  try {
    const q = query(
      collection(db, "orcamentos"),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      lista.innerHTML = '<p>Nenhum orçamento encontrado.</p>';
      return;
    }

    let html = '';

    snapshot.forEach((doc) => {
      const item = doc.data();

      html += `
        <div class="historico-item" style="
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
          background: #0f172a;
        ">
          <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <strong style="color:#f8fafc;">
              ${item.nomeCliente || 'Sem cliente'}
            </strong>
            <span style="color:#94a3b8; font-size: 0.9rem;">
              ${item.data || '-'}
            </span>
          </div>

          <div style="margin-top:8px; color:#cbd5e1;">
            <div>Área: ${formatarNumero(item.area)} m²</div>
            <div>Valor: ${formatarMoeda(item.precoFinal)}</div>
            <div>Preço por m²: ${formatarMoeda(item.precoM2Venda)}/m²</div>
            <div>Tipo de Laje: ${item.tipoLaje || '-'}</div>
          </div>
        </div>
      `;
    });

    lista.innerHTML = html;
  } catch (erro) {
    console.error('Erro ao carregar histórico:', erro);
    lista.innerHTML = '<p>Erro ao carregar histórico.</p>';
  }
}

async function alternarHistorico() {
  const historico = document.getElementById('historico');
  if (!historico) return;

  const estaOculto = historico.classList.contains('oculto');

  if (estaOculto) {
    historico.classList.remove('oculto');

    if (!historicoCarregado) {
      await carregarHistorico();
      historicoCarregado = true;
    }
  } else {
    historico.classList.add('oculto');
  }
}

function dadosParaCliente(dados) {
  return {
    area: dados.area,
    precoFinal: dados.precoFinal,
    precoVenda: dados.precoVenda,
    precoM2Venda: dados.precoM2Venda,
    frete: dados.frete,
    tipoLaje: dados.tipoLaje,
    formatoTexto: dados.formatoTexto,
    enchimentoTexto: dados.enchimentoTexto,
    qtdEnchimento: dados.qtdEnchimento,
    quantidadeTrelicas: dados.quantidadeTrelicas,
    comprimentoCadaTrelica: dados.comprimentoCadaTrelica,
    metrosLinearesTrelica: dados.metrosLinearesTrelica,
    volumeConcreto: dados.volumeConcreto,
    nomeCliente: dados.nomeCliente,
    data: dados.data
  };
}

/* ============================================================
   FIREBASE
   ============================================================ */
async function salvarOrcamento(dados) {
  try {
    await addDoc(collection(db, "orcamentos"), dados);
    console.log("✅ Orçamento salvo no Firebase");
  } catch (erro) {
    console.error("❌ Erro ao salvar:", erro);
  }
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  atualizarVersaoSistema();

  document.addEventListener('click', (e) => {
    if (window.innerWidth > 768) return;

    const clicouDentroDoMenu = e.target.closest('.nav-links');
    const clicouNoBotaoMenu = e.target.closest('#menu-toggle');

    if (!clicouDentroDoMenu && !clicouNoBotaoMenu) {
      document.querySelectorAll('.dropdown').forEach((item) => {
        item.classList.remove('open');
      });
    }
  });

  inicializarLogin();
  inicializarControles();
  inicializarLogoEmpresa();
  limparCamposTrelica();

  document.getElementById('btn-calcular')
    ?.addEventListener('click', calcularOrcamento);

  document.getElementById('btn-limpar')
    ?.addEventListener('click', limparFormulario);

  document.getElementById('btn-pdf')
    ?.addEventListener('click', gerarPDF);

  document.getElementById('btn-historico')
    ?.addEventListener('click', alternarHistorico);

  document.getElementById('btn-novo-calculo')
    ?.addEventListener('click', limparFormulario);

  document.getElementById('btn-logout')
    ?.addEventListener('click', sair);

  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  menuToggle?.addEventListener('click', () => {
    navLinks?.classList.toggle('active');

    const menuAberto = navLinks?.classList.contains('active');

    if (!menuAberto) {
      document.querySelectorAll('.dropdown').forEach((item) => {
        item.classList.remove('open');
      });
    }
  });

  document.querySelectorAll('.dropbtn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (window.innerWidth > 768) return;

      e.preventDefault();
      e.stopPropagation();

      const dropdown = btn.parentElement;
      if (!dropdown) return;

      const jaEstaAberto = dropdown.classList.contains('open');

      document.querySelectorAll('.dropdown').forEach((item) => {
        if (item !== dropdown) {
          item.classList.remove('open');
        }
      });

      dropdown.classList.toggle('open', !jaEstaAberto);
      btn.blur();
    });
  });

  [
    'larguraVao',
    'comprimentoVao',
    'larguraFrente',
    'larguraFundo',
    'compEsq',
    'compDir',
    'valorMetroTrelica',
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') calcularOrcamento();
    });
  });

  // 🔥 ATUALIZAÇÃO AUTOMÁTICA DO EPS
[
  'comprimentoEPS',
  'larguraEPS',
  'perdaEPS'
].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', calcularDadosEPS);
});

document.getElementById('marcaEPS')?.addEventListener('change', calcularDadosEPS);

// cálculo inicial ao abrir o sistema
calcularDadosEPS();
});