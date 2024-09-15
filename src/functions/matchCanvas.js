import Canvas from '@napi-rs/canvas';

async function teamCanvas(name, image){
    // Generate canvas and context
    const canvas = Canvas.createCanvas(300, 200);
    const ctx = canvas.getContext("2d");

    // Create canvas background
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if(image != null){
        const teamLogo = await Canvas.loadImage(image);

        // Resize the image
        const height = 150;
        let targetHeight = height;
        let topMargin = 0;
        let targetWidth = (teamLogo.width / teamLogo.height) * targetHeight;

        // If image is too large
        if(targetWidth > canvas.width) {
            targetWidth = canvas.width;
            targetHeight = (teamLogo.height / teamLogo.width) * targetWidth;
            topMargin = (height - targetHeight) / 2;
        }

        // Center it into the canvas
        const xCenter = (canvas.width - targetWidth) / 2;

        // Draw the image into the canvas
        ctx.drawImage(teamLogo, xCenter, topMargin, targetWidth , targetHeight);

        // Define the team name to display, it's color and it's size
        let fontSize = 25;
        ctx.fillStyle = "#FFFFFF";

        // Reduce the font size if needed
        do {
            ctx.font = `${fontSize}px sans-serif`;
            const textWidth = ctx.measureText(name).width;

            if(textWidth <= canvas.width) {
                break;
            }

            fontSize--;
        } while(fontSize > 0);

        // Place the text at bottom of canvas and center it
        const textY = canvas.height - 10;
        const textX = (canvas.width - ctx.measureText(name).width) / 2;

        // Draw the text into the canvas
        ctx.fillText(name, textX, textY);
    } else {
        // Define the team name to display, it's color and it's size
        let fontSize = 50;
        ctx.fillStyle = "#FFFFFF";

        // Reduce the font size if needed
        do {
            ctx.font = `${fontSize}px sans-serif`;
            const textWidth = ctx.measureText(name).width;

            if(textWidth <= canvas.width) {
                break;
            }

            fontSize--;
        } while(fontSize > 0);

        // Place the text in center
        const textY = (canvas.height - ctx.measureText(name).height) / 2;
        const textX = (canvas.width - ctx.measureText(name).width) / 2;

        // Draw the text into the canvas
        ctx.fillText(name, textX, textY);
    }

    return canvas;
}

export const matchCanvas = {
    async generate(team1Name, team1Image, team2Name, team2Image){
        // Generate each team canvas
        const team1Canvas = await teamCanvas(team1Name, team1Image);
        const team2Canvas = await teamCanvas(team2Name, team2Image);

        // Create canvas base
        const canvas = Canvas.createCanvas(team1Canvas.width + 100 + team2Canvas.width, team1Canvas.height);
        const context = canvas.getContext("2d");
        context.fillStyle = "#111111";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '30px sans-serif';
        context.fillStyle = '#ffffff';

        // Add team canvases
        context.drawImage(team1Canvas, 0, 0, team1Canvas.width, team1Canvas.height);
        context.drawImage(team2Canvas, team1Canvas.width + 100, 0, team2Canvas.width, team2Canvas.height);

        // Draw the "versus"
        let text = "VS";
        context.fillText(text, (canvas.width / 2) - (context.measureText(text).width / 2), (canvas.height / 2) + 15);

        return canvas;
    }
}