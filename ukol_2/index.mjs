import { readFile, writeFile } from 'fs/promises';

async function main() {
  try {
    // nacitani poctu souboru ze souboru instrukce.txt
    const instructions = await readFile('instrukce.txt', 'utf-8');
    const n = parseInt(instructions.trim(), 10);
    
    // je to kladny integer?
    if (isNaN(n) || n < 0) {
      console.error('subor instrukce.txt musi obsahovat cislo > 0');
      return;
    }
    
    // pole pre parallelne vytvorenie souboru
    const filePromises = [];
    for (let i = 0; i <= n; i++) {
      const fileName = `${i}.txt`;
      const fileContent = `Soubor ${i}`;
      filePromises.push(writeFile(fileName, fileContent));
    }
    
    // vytvoreni souboru
    await Promise.all(filePromises);
    
    console.log(`uspesne vytvorenych ${n+1} suborov (0.txt az ${n}.txt).`);
  } catch (error) {
    console.error('chyba', error);
  }
}

main();