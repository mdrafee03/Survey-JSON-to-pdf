import PDFDocument from 'pdfkit';
import { createWriteStream, readFileSync } from 'fs';

// set A3 page size
const screenWidth = 1190.5;
const screenHeight = 841.895;
const marginX = 20;
const marginY = 30;
const columnGap = 30;
const cellHeight = (screenHeight - marginY * 2) / 16;

// read json file
var inputJson = JSON.parse(readFileSync('input3.json', 'utf8'));

let totalCol;
const categoryXY = [];

const startFromCol1 = () => {
    let col = 1;
    let currentCell = 0;
    let bool = true;
    for (let i = 0; i < inputJson.categories.length; i++) {
        const category = inputJson.categories[i];
        categoryXY[i] = { x: col, y: currentCell };
        if (category.questions.length + currentCell + 1 <= 16) {
            currentCell += category.questions.length + 2;
        } else {
            col += 1;
            if (col === 3) {
                bool = false;
                break;
            }
            currentCell = category.questions.length + 2;
            categoryXY[i] = { x: col, y: 0 };
        }
    }
    totalCol = col + 1;
    return bool;
}
const startFromCol0 = () => {
    let col = 0;
    let currentCell = 9;
    inputJson.categories.forEach((category, i) => {
        categoryXY[i] = { x: col, y: currentCell };
        if (category.questions.length + currentCell + 1 <= 16) {
            currentCell += category.questions.length + 2;
        } else {
            col += 1;
            currentCell = category.questions.length + 2;
            categoryXY[i] = { x: col, y: 0 };
        }
    })
    totalCol = col + 1;
    return true;
}
if (!startFromCol1()) {
    startFromCol0();
}

const columnWidth = (screenWidth - marginX * 2 - columnGap * 3) / totalCol;

// Create a document
const doc = new PDFDocument({ size: [screenWidth, screenHeight], margins: { top: marginY, bottom: marginY, left: marginX, right: marginX } });

// Register fonts
doc.registerFont('Futura Medium', 'fonts/Futura_Medium.otf');
doc.registerFont('Myriad Pro Bold', 'fonts/Myriad_Pro_Bold.ttf');

// output file directory
doc.pipe(createWriteStream('output.pdf'));


const getColor = (percentage, benchmark) => {
    if (!benchmark) {
        return "#52B2E8"
    }
    else if (percentage - benchmark > 0) {
        return "#50BE3B"
    } else if (percentage - benchmark < 0) {
        return "#F1511B"
    }
}
const splitSentence = sentence => {
    let halfIndex = sentence.length / 2;
    let startIndex;
    let endIndex;
    let splittedIndex;
    for (let i = halfIndex; i < sentence.length; i++) {
        if (sentence.charAt(i) === " ") {
            endIndex = i;
            break;
        }
    }
    for (let i = halfIndex; i > 0; i--) {
        if (sentence.charAt(i) === " ") {
            startIndex = i;
            break;
        }
    }
    if (halfIndex - startIndex > endIndex - halfIndex) {
        splittedIndex = endIndex;
    } else {
        splittedIndex = startIndex;
    }
    return [sentence.slice(0, splittedIndex), sentence.slice(splittedIndex + 1)];
}
const writeCategory = (category, x, y) => {
    doc.font('Myriad Pro Bold')
        .fontSize(25)
        .fillColor("#2C3792")
        .text((category.name).toUpperCase(), x, y + 0.5 * doc.heightOfString(category.name));
    category.questions.forEach((question, quesIndex) => {
        const titleY = (quesIndex + 1) * cellHeight + y;
        const splittedSentences = splitSentence(question.Text);
        doc.font('Myriad Pro Bold')
            .fillColor('black')
            .fontSize(9)
            .text(splittedSentences[0], x, titleY, { width: columnWidth })
            .text(splittedSentences[1], { width: columnWidth });
        const percentageBackgroundY = titleY + doc.heightOfString(splittedSentences[0]) + doc.heightOfString(splittedSentences[1])
        const percentageBackgroundHeight = 17.5
        doc.rect(x, percentageBackgroundY, columnWidth * question.YesPercentage / 100, percentageBackgroundHeight)
            .fillAndStroke(getColor(question.YesPercentage, question.YesBenchmark));
        doc.fillColor('white')
            .font('Myriad Pro Bold')
            .text(`${question.YesPercentage}%`, x, percentageBackgroundY + 4, {
                width: columnWidth * question.YesPercentage / 100 - 5,
                align: 'right',
            });

    })
}

const heading = () => {
    const col1TopMargin = 30;

    // Logo
    const logoHeight = 70;
    doc.image('images/logo.png', 40, col1TopMargin, { width: 200, height: logoHeight });

    // Title
    const insightY = col1TopMargin + logoHeight + 10;
    const insightHeight = 50;
    doc.roundedRect(marginX, insightY, 230, insightHeight, 5)
        .fillAndStroke('black')
        .fillColor('white')
        .font('Futura Medium')
        .fontSize(28)
        .text(inputJson.title.toUpperCase(), marginX, insightY + insightHeight / 2 - 0.5 * doc.heightOfString('SOME INSIGTHS'), {
            width: 230,
            align: 'center',
        });

    // Summary
    const summaryY = insightY + insightHeight + 20
    const summaryHeight = 180;
    doc.roundedRect(marginX, summaryY, columnWidth, summaryHeight, 5)
        .fillAndStroke('#52B3E9')
        .fillColor('white')
        .font('Myriad Pro Bold')
        .fontSize(31)
    inputJson.summary.forEach((text, i) => {
        doc.text(text, marginX + 20, summaryY + 15 + i * doc.heightOfString(text) * 1.1, {
            width: 230,
            align: 'left',
        });
    });

    // Labels
    const circleRadius = 10
    const circleX = marginX + 2 * circleRadius;
    const circleY = summaryY + summaryHeight + 20;
    const circleGap = 30;
    const circleTextX = circleX + 2 * circleRadius;
    doc.fontSize(12);
    const circleTextY = circleY - 0.5 * circleRadius;
    doc.circle(circleX, circleY, circleRadius)
        .fillAndStroke('#50BE3B', '#50BE3B')
        .fillAndStroke('black', 'black')
        .text('Good', circleTextX, circleTextY)
    doc.circle(circleX, circleY + circleGap, circleRadius)
        .fillAndStroke('#F1511B', '#F1511B')
        .fillAndStroke('black', 'black')
        .text('To be improved', circleTextX, circleTextY + circleGap)
    doc.circle(circleX, circleY + circleGap * 2, circleRadius)
        .fillAndStroke('#52B2E8', '#52B2E8')
        .fillAndStroke('black', 'black')
        .text('No benchmark', circleTextX, circleTextY + circleGap * 2)
}

heading();
let occupiedcell = -2;
let currentCol = 1;
inputJson.categories.forEach((category, categoryIndex) => {
    writeCategory(category, marginX + categoryXY[categoryIndex].x * (columnWidth + columnGap), marginY + categoryXY[categoryIndex].y * cellHeight)
})

// Add another page

// Finalize PDF file
doc.end();