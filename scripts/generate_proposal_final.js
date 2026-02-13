const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF();

// Helper to keep track of Y position
let yPos = 20;
const margin = 20;
const pageWidth = doc.internal.pageSize.getWidth();
const maxLineWidth = pageWidth - margin * 2;

function checkPageBreak(heightNeeded) {
    if (yPos + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin;
    }
}

function addTitle(text) {
    checkPageBreak(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    // Center title
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
    yPos += 20;
}

function addSubtitle(text) {
    checkPageBreak(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Black
    doc.text(text, margin, yPos);
    yPos += 10;
}

function addText(text) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50); // Dark Gray
    const splitText = doc.splitTextToSize(text, maxLineWidth);
    checkPageBreak(splitText.length * 6 + 4);
    doc.text(splitText, margin, yPos);
    yPos += splitText.length * 6 + 4;
}

function addListItem(text) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    const bullet = "\u2022 "; // Bullet point
    const splitText = doc.splitTextToSize(bullet + text, maxLineWidth - 5);
    checkPageBreak(splitText.length * 6 + 2);
    doc.text(splitText, margin + 5, yPos);
    yPos += splitText.length * 6 + 2;
}

// Content
addTitle("Proposta de Desenvolvimento");

// Date
doc.setFontSize(10);
doc.setFont("helvetica", "italic");
doc.setTextColor(100, 100, 100);
const today = new Date();
const dateStr = today.toLocaleDateString('pt-BR');
doc.text(`Data: ${dateStr}`, margin, yPos);
doc.text(`Cliente: Guarandrade`, margin, yPos + 6);
yPos += 20;

addSubtitle("1. Resumo Executivo");
addText("Esta proposta apresenta o escopo e os valores para o desenvolvimento do Sistema de Gestão Guarandrade. Trata-se de uma solução de software moderna, criada sob medida para otimizar as operações da lanchonete, desde o atendimento ao cliente até o controle financeiro.");

addSubtitle("2. Funcionalidades Incluídas");
addText("O projeto contempla as seguintes funcionalidades e diferenciais técnicos já implementados ou em fase final:");

addListItem("Design Moderno (Glassmorphism): Interface visual impactante e intuitiva, proporcionando uma experiência de uso premium.");
addListItem("Compatibilidade Multiplataforma: Acesso via computador, tablet e celular (Responsivo).");
addListItem("Cardápio Digital & Pedidos: Catálogo completo de produtos com gestão ágil de pedidos.");
addListItem("Venda Direta Balcão: Interface ágil e simplificada para vendas rápidas diretamente no balcão (PDV).");
addListItem("Gestão de Mesas: Controle visual do status das mesas e pedidos associados.");
addListItem("Sistema de Cozinha (KDS): Tela interativa para a cozinha visualizar pedidos em preparação.");
addListItem("Controle de Estoque: Monitoramento de inventário com baixa automática conforme as vendas.");
addListItem("Contas a Pagar e Receber: Gestão financeira detalhada com fluxo de entradas e saídas.");
addListItem("QR Codes: Geração automática de QR Codes para facilitar o acesso ao menu.");
addListItem("Controle Financeiro: Dashboards de faturamento e relatórios exportáveis.");
addListItem("Tecnologia PWA: Possibilidade de instalar o sistema como um aplicativo no dispositivo.");

addSubtitle("3. Investimento");
addText("O valor total para o licenciamento de uso, entrega do código fonte desenvolvido até o momento e configuração inicial é de:");

yPos += 2;
doc.setFont("helvetica", "bold");
doc.setFontSize(24);
doc.setTextColor(0, 50, 150); // Navy blue-ish
doc.text("R$ 2.000,00", margin, yPos + 10);
doc.setFontSize(10);
doc.setTextColor(100, 100, 100);
doc.text("(Dois mil reais)", margin, yPos + 16);
yPos += 25;

addSubtitle("4. Prazos e Condições");
addText("O sistema será entregue em sua versão atual ('as-is'), com todas as funcionalidades listadas acima. O valor inclui suporte básico para a implantação inicial no ambiente do cliente.");

// Signature lines
yPos += 40;
checkPageBreak(40);

doc.setLineWidth(0.5);
doc.setDrawColor(0, 0, 0);

doc.line(margin, yPos, margin + 70, yPos);
doc.setFontSize(10);
doc.setTextColor(0, 0, 0);
doc.text("Desenvolvedor Responsável", margin, yPos + 5);

doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos);
doc.text("Aceite do Cliente", pageWidth - margin - 70, yPos + 5);

// Save
const pdfData = doc.output();
fs.writeFileSync('Proposta_Guarandrade.pdf', pdfData, 'binary');
console.log("Proposta atualizada gerada com sucesso: Proposta_Guarandrade.pdf");
