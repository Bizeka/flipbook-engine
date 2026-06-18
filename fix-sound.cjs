const fs = require('fs');
const path = require('path');

const mp3Path = path.join(__dirname, 'page-flip.mp3');
const enginePath = path.join(__dirname, 'src/engine.ts');

const mp3Buf = fs.readFileSync(mp3Path);
const b64 = 'data:audio/mp3;base64,' + mp3Buf.toString('base64');

let code = fs.readFileSync(enginePath, 'utf8');
code = code.replace(
    /const audioSrc = this\.options\.soundUrl \|\| 'data:audio\/mp3;base64,.*?';/,
    `const audioSrc = this.options.soundUrl || '${b64}';`
);

fs.writeFileSync(enginePath, code);
console.log('Successfully updated base64 audio in engine.ts');
