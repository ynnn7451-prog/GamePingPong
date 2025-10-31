// Nếu muốn nền mờ tối hơn để bóng nổi bật:
ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 🎾 Vẽ bóng xanh nổi bật (glow effect)
ctx.beginPath();
ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
ctx.shadowColor = "#00b7ff";   // ánh sáng lan quanh bóng
ctx.shadowBlur = 15;           // độ mờ sáng
ctx.fillStyle = "#00b7ff";     // màu bóng chính (giống paddle)
ctx.fill();
ctx.lineWidth = 2;
ctx.strokeStyle = "#00ffff";
ctx.stroke();
ctx.shadowBlur = 0;             // reset hiệu ứng mờ

// Vẽ paddle (màu primary để tương phản)
ctx.fillStyle = CANVAS_PADDLE_COLOR;
const ids = Object.keys(players);
ids.forEach((id, i) => {
    const x = i === 0 ? 20 : canvas.width - 30;
    const y = players[id].y - 40;
    ctx.fillRect(x, y, 10, 80);
});
