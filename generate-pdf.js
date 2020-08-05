import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

export function generatePdf(input) {
    // set A3 page size
    const screenWidth = 1190.5;
    const screenHeight = 841.895;
    const marginX = 20;
    const marginY = 30;

    // Create a document
    const doc = new PDFDocument({ size: [screenWidth, screenHeight], margins: { top: marginY, bottom: marginY, left: marginX, right: marginX } });

    // Register fonts
    doc.registerFont('Futura Medium', 'fonts/Futura_Medium.otf');
    doc.registerFont('Myriad Pro Bold', 'fonts/Myriad_Pro_Bold.ttf');

    // output file directory
    doc.pipe(createWriteStream('output.pdf'));

    // Calculate postions of the Categories and Questions and the no of total columns
    let { nodePositions, totalCol } = calculatePostionAndCol(input.categories);

    const columnGap = 30;
    const cellHeight = (screenHeight - marginY * 2) / 16;
    const columnWidth = (screenWidth - marginX * 2 - columnGap * 3) / totalCol;

    // Render General Info in top left
    renderGeneralInfo(doc, marginX, input.title, input.summary, columnWidth);

    // Generate the Tree from Category and Questions
    const jsonTree = generateTree(input.categories, nodePositions);

    // Render the Category and Questions
    jsonTree.forEach(node => renderCategories(doc, node, marginX, marginY, columnWidth, columnGap, cellHeight));

    // Finalize PDF file
    doc.end();
}

// Generate Tree
function generateTree(categories, nodePositions) {
    let jsonTree = [];
    let iterator = 0;
    categories.forEach(category => {
        jsonTree.push({ text: category.name, type: 'category', position: nodePositions[iterator] });
        iterator += 1;
        category.questions.forEach(question => {
            jsonTree.push({ text: question.Text, type: 'question', percentage: question.YesPercentage, benchmark: question.YesBenchmark, position: nodePositions[iterator] });
            iterator += 1;
        })
    })
    return jsonTree;
}

// General Info
function renderGeneralInfo(doc, marginX, title, summary, columnWidth) {
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
        .text(title.toUpperCase(), marginX, insightY + insightHeight / 2 - 0.5 * doc.heightOfString('SOME INSIGTHS'), {
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
    summary.forEach((text, i) => {
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

// Render the Category and Questions
function renderCategories(doc, node, marginX, marginY, columnWidth, columnGap, cellHeight) {
    const x = marginX + node.position.x * (columnWidth + columnGap)
    const y = marginY + node.position.y * cellHeight
    const type = node.type;
    const text = node.text;
    const percentage = node.percentage;
    const benchmark = node.benchmark;
    if (type === 'category') {
        doc.font('Myriad Pro Bold')
            .fontSize(25)
            .fillColor("#2C3792")
            .text((text).toUpperCase(), x, y + 0.5 * doc.heightOfString(text));
    } else {
        const splittedSentences = splitSentence(text);
        doc.font('Myriad Pro Bold')
            .fillColor('black')
            .fontSize(9)
            .text(splittedSentences[0], x, y, { width: columnWidth })
            .text(splittedSentences[1], { width: columnWidth });
        const rectY = y + doc.heightOfString(splittedSentences[0]) + doc.heightOfString(splittedSentences[1])
        const rectHeight = 17.5
        doc.rect(x, rectY, columnWidth * percentage / 100, rectHeight)
            .fillAndStroke(getBarColor(percentage, benchmark));
        doc.fillColor('white')
            .font('Myriad Pro Bold')
            .text(`${percentage}%`, x, rectY + 0.5 * doc.heightOfString(percentage), {
                width: columnWidth * percentage / 100 - 5,
                align: 'right',
            });
    }
}

// Split a sentence into 2 lines
function splitSentence(sentence) {
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

// Calculate each Question and Category Position
function calculatePostionAndCol(categories) {
    let nodePositions = [];
    let col = 1;
    let currentCell = 0;
    const preparePosition = () => {
        for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            if (category.questions.length + currentCell < 16) {
                nodePositions.push({ x: col, y: currentCell });
                category.questions.forEach(() => {
                    currentCell += 1;
                    nodePositions.push({ x: col, y: currentCell });
                })
                currentCell += 2;
            } else if (15 - currentCell >= 4) {
                const splitCell = category.questions.length - (15 - currentCell) >= 2 ? 15 : 14;
                nodePositions.push({ x: col, y: currentCell });
                category.questions.forEach((_, quesIndex) => {
                    currentCell += 1;
                    nodePositions.push({ x: col, y: currentCell });
                    if (currentCell === splitCell && quesIndex !== category.questions.length - 1) {
                        col += 1;
                        currentCell = -1;
                    }
                })
                currentCell += 2;
            } else {
                col += 1;
                currentCell = 0;
                nodePositions.push({ x: col, y: currentCell });
                category.questions.forEach(() => {
                    currentCell += 1;
                    nodePositions.push({ x: col, y: currentCell });
                });
                currentCell += 2;
            }
        }
    }
    preparePosition();
    if (col >= 3) {
        col = 0;
        currentCell = 9;
        nodePositions = [];
        preparePosition();
    }
    return { nodePositions, totalCol: col + 1 };
}

// Get Color Of Bar
function getBarColor(percentage, benchmark) {
    if (!benchmark) {
        return "#52B2E8"
    }
    else if (percentage - benchmark >= 0) {
        return "#50BE3B"
    } else if (percentage - benchmark < 0) {
        return "#F1511B"
    }
}