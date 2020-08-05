import { readFileSync } from 'fs';
import {generatePdf} from './generate-pdf.js';
const inputFileName = process.argv[2];
var input = JSON.parse(readFileSync(inputFileName, 'utf8'));
generatePdf(input);