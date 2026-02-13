const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF();
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 20;
const maxLineWidth = pageWidth - margin * 2;

// Colors
const PRIMARY_COLOR = [26, 35, 126]; // Deep Navy Blue
const ACCENT_COLOR = [255, 112, 67]; // Orange-ish for highlights (optional, using mostly blues/greys)
const TEXT_COLOR = [60, 60, 60];
const TITLE_COLOR = [30, 30, 30];
const BG_LIGHT_GRAY = [245, 245, 245];

let yPos = 0;

// Helper: Header
function addHeader() {
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("MS Group Technology", margin, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Soluções em Tecnologia e Software", margin, 28);

    // Reset Y position for content
    yPos = 60;
}

// Helper: Footer
function addFooter(pageNumber) {
    const footerY = pageHeight - 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("MS Group Technology - Confidencial", margin, footerY + 5);

    // Page num
    const pageStr = `Página ${pageNumber}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), footerY + 5);
}

// Helper: Check Page Break
function checkPageBreak(heightNeeded) {
    if (yPos + heightNeeded > pageHeight - 30) { // 30 is bottom margin for footer
        addFooter(doc.internal.getNumberOfPages());
        doc.addPage();
        // Add header for subsequent pages (optional, maybe smaller?)
        // Let's keep it simple for now, maybe just a small margin top
        yPos = 30;
    }
}

// Helper: Section Title
function addSectionTitle(text) {
    checkPageBreak(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(text.toUpperCase(), margin, yPos);

    // Underline
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 2, margin + 20, yPos + 2); // Short underline

    yPos += 15;
}

// Helper: Body Text
function addText(text, isBold = false) {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_COLOR);

    const splitText = doc.splitTextToSize(text, maxLineWidth);
    checkPageBreak(splitText.length * 5 + 5);

    doc.text(splitText, margin, yPos);
    yPos += splitText.length * 5 + 5;
}

// Helper: List Item with nice bullet
function addListItem(title, description) {
    checkPageBreak(20); // Create space for at least title + one line of desc

    // Bullet position relative to Title
    doc.setFillColor(...PRIMARY_COLOR);
    doc.circle(margin + 2, yPos - 1.5, 1, 'F');

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TITLE_COLOR);
    doc.text(title, margin + 8, yPos);

    yPos += 5; // Move down for description

    // Description
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_COLOR);

    // Split description to fit
    const splitDesc = doc.splitTextToSize(description, maxLineWidth - 10);

    // Check if description needs page break
    if (yPos + (splitDesc.length * 5) > pageHeight - 30) {
        doc.addPage();
        yPos = 30;
        // Reprint title part? No, just continue description implies continuity but usually better to break before item. 
        // Our checkPageBreak at start handles most cases, but long descriptions might still cross.
        // For simplicity, let's just print.
    }

    doc.text(splitDesc, margin + 8, yPos);
    yPos += splitDesc.length * 5 + 4; // Spacing after item
}

// Helper: Price Box
function addPriceBox(value) {
    checkPageBreak(50);

    yPos += 5;
    const boxHeight = 40;
    doc.setFillColor(...BG_LIGHT_GRAY);
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin, yPos, maxLineWidth, boxHeight, 'FD'); // Fill and Draw

    // Label
    doc.setFontSize(12);
    doc.setTextColor(...TEXT_COLOR);
    doc.setFont("helvetica", "normal");
    doc.text("Investimento Total", margin + 10, yPos + 12);

    // Value
    doc.setFontSize(24);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text(value, margin + 10, yPos + 26);

    yPos += boxHeight + 20;
}

// --- GENERATE CONTENT ---

// Page 1
addHeader();

// Title of Proposal
doc.setFont("helvetica", "bold");
doc.setFontSize(24);
doc.setTextColor(...TITLE_COLOR);
doc.text("Proposta de Desenvolvimento", margin, yPos);
yPos += 10;

doc.setFontSize(14);
doc.setTextColor(100, 100, 100);
doc.text("Sistema de Gestão Guarandrade", margin, yPos);
yPos += 20;

// Date and Client info
const today = new Date();
const dateStr = today.toLocaleDateString('pt-BR');

doc.setFontSize(10);
doc.setFont("helvetica", "normal");
doc.setTextColor(...TEXT_COLOR);
doc.text(`Data de Emissão: ${dateStr}`, margin, yPos);
yPos += 6;
doc.text(`Cliente: Guarandrade`, margin, yPos);
yPos += 6;
doc.text(`Validade da Proposta: 15 dias`, margin, yPos);

yPos += 20;

// 1. Introdução
addSectionTitle("1. Introdução & Contexto");
addText("A MS Group Technology tem o prazer de apresentar esta proposta técnica e comercial para o desenvolvimento e evolução do Sistema de Gestão Guarandrade. Nosso objetivo é fornecer uma ferramenta robusta, escalável e de design premium para otimizar todas as operações do seu estabelecimento.");
yPos += 5;
addText("Entendemos que o mercado de alimentação exige agilidade e controle preciso. Por isso, nossa solução não é apenas um sistema, mas um parceiro digital que integra atendimento, cozinha e gestão financeira em uma única plataforma.");

// 2. Escopo do Projeto
addSectionTitle("2. Escopo Funcional");
addText("O projeto consiste em um sistema Web Progressivo (PWA) de alta performance, acessível em qualquer dispositivo. Abaixo detalhamos os módulos incluídos:");

addListItem("Design Premium (Glassmorphism)", "Interface moderna, limpa e com efeitos visuais sofisticados, garantindo facilidade de uso e uma imagem profissional.");
addListItem("Cardápio Digital & Pedidos", "Catálogo interativo de produtos com gestão completa de pedidos e categorias.");
addListItem("Gestão de Mesas em Tempo Real", "Mapa visual de mesas com status (livre, ocupada, conta solicitada) e atalhos rápidos para atendimento.");
addListItem("Venda Direta Balcão (PDV)", "Módulo otimizado para lançamentos rápidos de balcão, ideal para clientes que não ocupam mesas.");
addListItem("Sistema KDS (Cozinha)", "Kitchen Display System para substituir impressoras de papel, exibindo pedidos em telas na área de preparo.");
addListItem("Controle de Estoque Inteligente", "Baixa automática de insumos e produtos conforme as vendas são realizadas.");
addListItem("Gestão Financeira Completa", "Controle de Contas a Pagar e Receber, Fluxo de Caixa, e Relatórios de Faturamento.");
addListItem("QR Codes", "Geração automática de QR Codes para acesso rápido dos clientes ao cardápio.");
addListItem("Instalação como App (PWA)", "Tecnologia que permite instalar o sistema em tablets e celulares sem necessidade de lojas de aplicativos.");

// 2.1 Detalhes Técnicos e Infraestrutura
addText("Além das funcionalidades visíveis, o projeto contempla uma arquitetura robusta de bastidores:", true);
addListItem("Infraestrutura em Nuvem (Cloud)", "Configuração de servidor VPS de alta performance e banco de dados escalável para garantir estabilidade.");
addListItem("Segurança e Criptografia", "Conexões seguras (HTTPS/SSL) e proteção de dados sensíveis conformes às melhores práticas.");
addListItem("Backup Automático", "Rotinas de segurança para preservação dos dados do sistema.");


// 3. Tecnologias
// addSectionTitle("3. Stack Tecnológico");
// addText("Utilizamos as tecnologias mais modernas do mercado: React/Next.js para o frontend, garantindo velocidade extrema; Supabase para banco de dados em tempo real; e TailwindCSS para estilização consistente.");

// 4. Investimento
addSectionTitle("3. Investimento e Condições");
addText("Em consideração ao escopo detalhado acima e ao licenciamento de uso do software desenvolvido pela MS Group Technology:");

addPriceBox("R$ 2.000,00");

addSectionTitle("3.1 Condições de Pagamento");
addText("Para viabilizar a contratação de serviços de terceiros essenciais (Hospedagem, Servidor VPS, Banco de Dados) e início imediato das configurações finais:", true);

addListItem("Entrada de 50%", "Pagamento inicial de R$ 1.000,00 no ato do aceite para custear infraestrutura e setup.");
addListItem("Saldo Restante (50%)", "Pagamento de R$ 1.000,00 na entrega final e validação do sistema.");

addText("O valor total contempla:", true);
// Small bullet list manually
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
const subItems = [
    "- Código fonte completo do projeto em seu estado atual.",
    "- Configuração inicial e deploy (colocação no ar).",
    "- Garantia de funcionamento dos módulos listados."
];
subItems.forEach(item => {
    doc.text(item, margin + 5, yPos);
    yPos += 5;
});
yPos += 10;

// 5. Assinaturas
checkPageBreak(50);
addSectionTitle("4. Aprovação");
addText("Ao assinar abaixo, o cliente declara estar de acordo com os termos e funcionalidades descritas nesta proposta.");

yPos += 30;

// Signature lines
doc.setLineWidth(0.5);
doc.setDrawColor(0, 0, 0);

const sigY = yPos;
// Line 1
doc.line(margin, sigY, margin + 70, sigY);
doc.setFontSize(8);
doc.text("MS Group Technology", margin, sigY + 5);

// Line 2
doc.line(pageWidth - margin - 70, sigY, pageWidth - margin, sigY);
doc.text("Responsável Guarandrade", pageWidth - margin - 70, sigY + 5);

// Final Footer
addFooter(doc.internal.getNumberOfPages());

// Save
const pdfData = doc.output();
fs.writeFileSync('Proposta_Comercial_MS_Group.pdf', pdfData, 'binary');
console.log("Proposta gerada: Proposta_Comercial_MS_Group.pdf");
