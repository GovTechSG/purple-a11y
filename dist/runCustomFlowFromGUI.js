import { argv } from 'process';
import fs from 'fs';
const generatedScript = argv[2];
console.log(argv);
console.log(generatedScript);
const genScriptString = fs.readFileSync(generatedScript, 'utf-8');
const genScriptCompleted = new Promise((resolve, reject) => {
    eval(`(async () => {
        try {
            ${genScriptString} 
            resolve(); 
        } catch (e) {
            reject(e)
        }
        })();`);
});
await genScriptCompleted;
// const run = () => {
//     eval(`(async () => {
//         try {
//             ${genScriptString}
//         } catch (e) {
//             console.log(e);
//         }
//     })();`)
// }
// run();
