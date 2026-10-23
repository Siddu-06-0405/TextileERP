import xlsx from "xlsx";

const workbook = xlsx.readFile("./products.xlsx");
const sheetName = workbook.SheetNames[0];
const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

// Log only the first row (the headers)
console.log("Header Row:", sheetData[0]);
