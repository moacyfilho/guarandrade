const { jsPDF } = require('jspdf');
const fs = require('fs');

try {
    const doc = new jsPDF();
    doc.text("Hello World", 10, 10);
    doc.save('test_pdf.pdf'); // Node support for save might be different, usually output()
    const data = doc.output();
    fs.writeFileSync('test_output.pdf', data, 'binary');
    console.log("PDF generated successfully");
} catch (e) {
    console.error("Error:", e);
}
