/* =========================================================================
    SISTEMA LAJES FÁBRICA - MOTOR DE CÁLCULO (REVISADO)
   ========================================================================= */

// 1. VARIÁVEIS E CONFIGURAÇÕES GLOBAIS
let formatoAtual = 'regular';
let enchimentoAtual = 'eps';

// Regras técnicas da fábrica
const CONSUMO_EPS_M2 = 3; 
const CONSUMO_CERAMICA_M2 = 13; 
const MARGEM_CONCRETO = 1.20; // Fator de 20% de segurança

// 2. FUNÇÕES DE NAVEGAÇÃO E LOGIN

// Função para mostrar ou esconder o card de login ao clicar em "Acessar"
function exibirCardLogin() {
    const card = document.getElementById('card-login-principal');
    if (card) {
        card.classList.toggle('oculto');
    }
}

// Função para validar login e entrar no sistema
function entrarNoSistema() {
    const usuario = document.getElementById('usuario-login').value;
    const senha = document.getElementById('senha-login').value;
    const telaLogin = document.getElementById('tela-login');
    const telaSistema = document.getElementById('tela-sistema');

    // Validação simples: aceita qualquer credencial preenchida
    if (usuario.trim() !== "" && senha.trim() !== "") {
        telaLogin.classList.add('oculto');    // Esconde tela de login e navbar
        telaSistema.classList.remove('oculto'); // Mostra a calculadora
        console.log("Acesso concedido ao sistema de lajes.");
    } else {
        alert("Por favor, preencha o usuário e a senha para acessar.");
    }
}

// 3. SELEÇÃO DE FORMATO E ENCHIMENTO (UI)

function alternarFormato(formato, evento) {
    formatoAtual = formato;
    
    // Gerencia o visual dos botões "pill"
    const container = document.getElementById('formatoAreaControl');
    const botoes = container.querySelectorAll('.segmented-btn');
    botoes.forEach(btn => btn.classList.remove('active'));
    
    // Adiciona a classe active no botão clicado
    evento.currentTarget.classList.add('active');
    
    // Se no futuro você criar campos para "Irregular", a lógica de esconder/mostrar entra aqui
    console.log("Formato selecionado: " + formatoAtual);
}

function definirEnchimento(tipo, evento) {
    enchimentoAtual = tipo;
    
    const container = document.getElementById('enchimentoControl');
    const botoes = container.querySelectorAll('.segmented-btn');
    botoes.forEach(btn => btn.classList.remove('active'));
    
    evento.currentTarget.classList.add('active');
    console.log("Enchimento selecionado: " + enchimentoAtual);
}

// 4. MOTOR DE CÁLCULO TÉCNICO E FINANCEIRO

function calcularOrcamento() {
    // Captura de valores das medidas
    const largura = Number(document.getElementById('larguraVao').value);
    const comprimento = Number(document.getElementById('comprimentoVao').value);
    
    // Captura de valores financeiros
    const custoFabricaM2 = Number(document.getElementById('precoM2').value) || 0;
    const freteValor = Number(document.getElementById('freteKM').value) || 0;
    const margemLucroPercent = Number(document.getElementById('margemLucro').value) || 0;

    // Validação de entrada
    if (!largura || !comprimento || largura <= 0 || comprimento <= 0) {
        alert("Atenção: Informe as dimensões (largura e comprimento) para calcular.");
        return;
    }

    // --- CÁLCULOS DE ENGENHARIA ---
    const areaTotal = largura * comprimento;
    
    // Cálculo de enchimento baseado no tipo
    let quantidadeEnchimento = (enchimentoAtual === 'eps') 
        ? areaTotal * CONSUMO_EPS_M2 
        : areaTotal * CONSUMO_CERAMICA_M2;
    
    // Cálculo do volume de concreto com margem de 20%
    // Base técnica: 0.12m³ de concreto por m² de laje padrão
    const volumeConcreto = areaTotal * 0.12 * MARGEM_CONCRETO;

    // --- CÁLCULOS FINANCEIROS ---
    const custoTotalProducao = areaTotal * custoFabricaM2;
    const valorVendaSemFrete = custoTotalProducao * (1 + (margemLucroPercent / 100));
    const valorTotalFinal = valorVendaSemFrete + freteValor;

    // --- EXIBIÇÃO DOS RESULTADOS NO HTML ---
    
    // 1. Mostra a seção de resultados
    document.getElementById('resumoResultados').classList.remove('oculto');

    // 2. Preenche as Tags de Resumo
    document.getElementById('areaVao').textContent = `${areaTotal.toFixed(2)} m²`;
    document.getElementById('custoProducao').textContent = formatarReal(custoTotalProducao);
    document.getElementById('custoVenda').textContent = formatarReal(valorVendaSemFrete);
    
    // 3. Preenche o Preço Final (Destaque)
    document.getElementById('precoFinal').textContent = formatarReal(valorTotalFinal);

    // 4. Preenche Detalhes Técnicos
    if(document.getElementById('consumoEnchimento')) {
        document.getElementById('consumoEnchimento').textContent = `${Math.ceil(quantidadeEnchimento)} un (${enchimentoAtual.toUpperCase()})`;
    }
    if(document.getElementById('volumeConcreto')) {
        document.getElementById('volumeConcreto').textContent = `${volumeConcreto.toFixed(2)} m³`;
    }
    if(document.getElementById('outputFrete')) {
        document.getElementById('outputFrete').textContent = formatarReal(freteValor);
    }
    if(document.getElementById('labelMargem')) {
        document.getElementById('labelMargem').textContent = `${margemLucroPercent}%`;
    }

    // Scroll suave para os resultados
    document.getElementById('resumoResultados').scrollIntoView({ behavior: 'smooth' });
}

// 5. UTILITÁRIOS E PDF

// Formatação de moeda brasileira
function formatarReal(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para gerar o documento oficial em PDF
function gerarPDF() {
    const conteudoPDF = document.getElementById('resumoResultados');
    
    // Verifica se há resultados para imprimir
    if (conteudoPDF.classList.contains('oculto')) {
        alert("Calcule o orçamento antes de gerar o PDF.");
        return;
    }

    const opcoes = {
        margin: 15,
        filename: 'Orcamento_TechTI_Lajes.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opcoes).from(conteudoPDF).save();
}