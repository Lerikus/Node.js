import fs from 'fs/promises';

async function main() {
    try {
        // nacitanie instrukcii zo suboru
        const instructions = await fs.readFile('instrukce.txt', 'utf-8');
        // predpoklad ze akceptujeme instrukcie ktore obsahuju viac ako 2 slova - berieme prve dve
        const [sourceFile, targetFile] = instructions.trim().split(/\s+/);

        // kontrola existencie zdrojoveho suboru
        try {
            await fs.access(sourceFile);
        } catch (error) {
            console.error(`zdrojovy soubor "${sourceFile}" neexistuje`);
            return;
        }

        // nacitanie obsahuj zdrojoveho suboru 
        const data = await fs.readFile(sourceFile, 'utf-8');

        // zapis obsahu do cieloveho suboru a vypis spravy
        await fs.writeFile(targetFile, data);
        console.log(`obsah zkopirovany do suboru "${targetFile}".`);
    } catch (error) {
        console.error('chyba', error);
    }
}

main();