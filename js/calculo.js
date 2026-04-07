/* =========================================================================
   SISTEMA LAJES FÁBRICA - MOTOR DE CÁLCULO (REVISADO E COMPLETO)
   ========================================================================= */

// 1. VARIÁVEIS E CONFIGURAÇÕES GLOBAIS
let formatoAtual = 'regular';
let enchimentoAtual = 'eps';

// Regras técnicas da fábrica
const CONSUMO_EPS_M2 = 3; 
const CONSUMO_CERAMICA_M2 = 13; 
const MARGEM_CONCRETO = 1.20; // Fator de 20% de segurança

// 2. FUNÇÕES DE NAVEGAÇÃO E LOGIN

function exibirCardLogin() {
    const card = document.getElementById('card-login-principal');
    if (card) {
        card.classList.toggle('oculto');
    }
}

function entrarNoSistema() {
    const usuario = document.getElementById('usuario-login').value;
    const senha = document.getElementById('senha-login').value;
    
    // Busca pelos dois IDs possíveis para evitar falhas
    const telaLogin = document.getElementById('secao-login') || document.getElementById('tela-login');
    const telaSistema = document.getElementById('tela-sistema');

    if (usuario.trim() !== "" && senha.trim() !== "") {
        if (telaLogin) {
            telaLogin.classList.add('oculto');
            telaLogin.style.display = 'none'; // Garante que a tela suma
        }
        if (telaSistema) {
            telaSistema.classList.remove('oculto');
            telaSistema.style.display = 'block';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Sobe a tela para o usuário
    } else {
        alert("Por favor, preencha o usuário e a senha para acessar.");
    }
}

// 3. SELEÇÃO DE FORMATO E ENCHIMENTO (UI)

function alternarFormato(formato, evento) {
    formatoAtual = formato;
    
    // Troca a cor dos botões
    const container = document.getElementById('formatoAreaControl');
    const botoes = container.querySelectorAll('.segmented-btn');
    botoes.forEach(btn => btn.classList.remove('active'));
    evento.currentTarget.classList.add('active');

    // Lógica para mostrar/esconder as caixas certas
    const divRegular = document.getElementById('campos-regular');
    const divIrregular = document.getElementById('campos-irregular');

    if (formato === 'irregular') {
        if (divRegular) divRegular.style.display = 'none';
        if (divIrregular) divIrregular.style.display = 'flex'; 
    } else {
        if (divRegular) divRegular.style.display = 'flex';
        if (divIrregular) divIrregular.style.display = 'none';
    }
}

function definirEnchimento(tipo, evento) {
    enchimentoAtual = tipo;
    
    const container = document.getElementById('enchimentoControl');
    const botoes = container.querySelectorAll('.segmented-btn');
    botoes.forEach(btn => btn.classList.remove('active'));
    evento.currentTarget.classList.add('active');
}

// 4. MOTOR DE CÁLCULO TÉCNICO E FINANCEIRO

function calcularOrcamento() {
    let areaTotal = 0;

    // --- CAPTURA DE ÁREA CONFORME O FORMATO ---
    if (formatoAtual === 'regular') {
        const largura = Number(document.getElementById('larguraVao').value) || 0;
        const comprimento = Number(document.getElementById('comprimentoVao').value) || 0;
        
        if (largura <= 0 || comprimento <= 0) {
            alert("Atenção: Informe a largura e o comprimento do vão.");
            return;
        }
        areaTotal = largura * comprimento;
        
    } else {
        // CÁLCULO IRREGULAR (Média das 4 paredes)
        const frente = Number(document.getElementById('larguraFrente').value) || 0;
        const fundo = Number(document.getElementById('larguraFundo').value) || 0;
        const esq = Number(document.getElementById('compEsq').value) || 0;
        const dir = Number(document.getElementById('compDir').value) || 0;
        
        if (frente <= 0 || fundo <= 0 || esq <= 0 || dir <= 0) {
            alert("Atenção: Para lajes irregulares, informe a medida das 4 paredes.");
            return;
        }
        
        const mediaLargura = (frente + fundo) / 2;
        const mediaComprimento = (esq + dir) / 2;
        areaTotal = mediaLargura * mediaComprimento;
    }

    // --- CAPTURA DE VALORES FINANCEIROS ---
    const custoFabricaM2 = Number(document.getElementById('precoM2').value) || 0;
    const freteValor = Number(document.getElementById('freteKM').value) || 0;
    const margemLucroPercent = Number(document.getElementById('margemLucro').value) || 0;

    // --- CÁLCULOS DE ENGENHARIA ---
    let quantidadeEnchimento = (enchimentoAtual === 'eps') 
        ? areaTotal * CONSUMO_EPS_M2 
        : areaTotal * CONSUMO_CERAMICA_M2;
    
    const volumeConcreto = areaTotal * 0.045 * MARGEM_CONCRETO;

    // --- CÁLCULOS FINANCEIROS ---
    const custoTotalProducao = areaTotal * custoFabricaM2;
    const valorVendaSemFrete = custoTotalProducao * (1 + (margemLucroPercent / 100));
    const valorTotalFinal = valorVendaSemFrete + freteValor;

    // --- EXIBIÇÃO DOS RESULTADOS NO HTML ---
    const divResultados = document.getElementById('resumoResultados');
    if (divResultados) {
        divResultados.classList.remove('oculto');
        divResultados.style.display = 'block';
    }

    preencherTextoSeguro('areaVao', `${areaTotal.toFixed(2).replace('.', ',')} m²`);
    preencherTextoSeguro('custoProducao', formatarReal(custoTotalProducao));
    preencherTextoSeguro('custoVenda', formatarReal(valorVendaSemFrete));
    preencherTextoSeguro('precoFinal', formatarReal(valorTotalFinal));
    preencherTextoSeguro('consumoEnchimento', `${Math.ceil(quantidadeEnchimento)} un (${enchimentoAtual.toUpperCase()})`);
    preencherTextoSeguro('volumeConcreto', `${volumeConcreto.toFixed(2).replace('.', ',')} m³`);
    preencherTextoSeguro('outputFrete', formatarReal(freteValor));
    preencherTextoSeguro('labelMargem', `${margemLucroPercent}%`);

    if (divResultados) {
        divResultados.scrollIntoView({ behavior: 'smooth' });
    }
}

// 5. UTILITÁRIOS E PDF

// Função para garantir que o sistema não trave se faltar um ID no HTML
function preencherTextoSeguro(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = texto;
    }
}

function formatarReal(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function gerarPDF() {
    const conteudoPDF = document.getElementById('resumoResultados');
    
    if (!conteudoPDF || conteudoPDF.classList.contains('oculto')) {
        alert("Calcule o orçamento antes de gerar o PDF.");
        return;
    }

    const opcoes = {
        margin: 15,
        filename: 'Orcamento_TechTI_Lajes.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opcoes).from(conteudoPDF).save();
}

// --- FECHAR LOGIN AO CLICAR FORA ---
document.addEventListener('mousedown', function(event) {
    const cardLogin = document.getElementById('card-login-principal');
    const botaoAcesso = document.querySelector('.nav-login-btn');

    // Verifica se o card de login existe e está visível na tela
    if (cardLogin && !cardLogin.classList.contains('oculto')) {
        
        // Se o clique NÃO foi dentro do card de login E NÃO foi no botão "Acessar"
        if (!cardLogin.contains(event.target) && !botaoAcesso.contains(event.target)) {
            cardLogin.classList.add('oculto'); // Esconde o card
        }
    }
});