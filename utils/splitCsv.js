
const fs = require('fs');
const readline = require('readline');
const inputFile = process.argv[2];
const outputDir = process.argv[3];
const chunkSize = parseInt(process.argv[4]);

if (!inputFile || !outputDir || !chunkSize) {
  console.error('Please provide input file, output directory, and chunk size as command line arguments.');
  process.exit(1);
}

let header = '';
let lineCount = 0;
let chunkCount = 0;
let chunkLines = [];

async function splitCSV() {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });


  for await (const line of rl) {
    if (lineCount === 0) {
      header = line;
    } else {
      chunkLines.push(line);
    }

    if (chunkLines.length === chunkSize) {
      await writeChunk(chunkLines, chunkCount);
      chunkLines = [];
      chunkCount++;
    }

    lineCount++;
  }

  if (chunkLines.length > 0) {
    await writeChunk(chunkLines, chunkCount);
  }

  console.log('CSV split into chunks successfully!');
}

async function writeChunk(lines, chunkCount) {
  const chunkFileName = `${outputDir}/chunk_${chunkCount}.csv`;
  const chunkContent = `${header}\n${lines.join('\n')}`;

  await fs.promises.writeFile(chunkFileName, chunkContent);
}

splitCSV().catch(console.error);
