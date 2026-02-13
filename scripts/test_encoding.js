const { jsPDF } = require('jspdf');
const fs = require('fs');

try {
    const doc = new jsPDF();
    doc.text("Teste de acentuação: Água, Pão, Coração, Lançamento.", 10, 10);
    const data = doc.output();
    fs.writeFileSync('test_encoding.pdf', data, 'binary');
    console.log("Encoding test generated");
} catch (e) {
    console.error(e);
}
