const socket = io();

// DOM Elements
const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const background = new Image();
background.src = "background.jpg";
const roomInfo = document.getElementById("roomInfo");
const playerNameInput = document.getElementById("playerName");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const randomRoomBtn = document.getElementById("randomRoom");
const roomIdInput = document.getElementById("roomId");

// Top scoreboard elements (inside game frame)
const topLeftNameEl = document.getElementById("topLeftName");
const topLeftScoreEl = document.getElementById("topLeftScore");
const topRightNameEl = document.getElementById("topRightName");
const topRightScoreEl = document.getElementById("topRightScore");
const gameMessageEl = document.getElementById("gameMessage");

// Read theme colors from CSS variables so canvas elements contrast with background
const rootStyles = getComputedStyle(document.documentElement);
const CANVAS_BALL_COLOR = (rootStyles.getPropertyValue('--text') || '#07203f').trim();
const CANVAS_PADDLE_COLOR = (rootStyles.getPropertyValue('--primary') || '#0b66ff').trim();

let players = {};
let ball = { x: 300, y: 200 };
let message = "";
let gameOver = false;
let currentRoom = null;

// Event Listeners
createRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert("Vui lòng nhập tên của bạn!");
        return;
    }
    socket.emit("createRoom", playerName);
});

joinRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    const roomId = roomIdInput.value.trim();
    if (!playerName || !roomId) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }
    socket.emit("joinRoom", { roomId, playerName });
});

randomRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert("Vui lòng nhập tên của bạn!");
        return;
    }
    socket.emit("joinRandom", playerName);
});

// Di chuyển paddle
document.addEventListener("mousemove", (e) => {
  if (gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const posY = e.clientY - rect.top;
  socket.emit("move", posY);
});

// Socket Events
socket.on("roomCreated", ({ roomId }) => {
    // Reset game state trước khi vào phòng mới
    resetGameState();
    currentRoom = roomId;
    roomInfo.textContent = roomId;
    homeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    message = "⏳ Đang chờ người chơi khác...";
    draw();
});

socket.on("roomJoined", ({ roomId }) => {
    // Reset game state trước khi vào phòng mới
    resetGameState();
    currentRoom = roomId;
    roomInfo.textContent = roomId;
    homeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    message = "✅ Đã vào phòng thành công!";
    draw();
});

socket.on("gameStart", ({ players: playersList }) => {
    // Reset trạng thái game khi bắt đầu trận mới
    resetGameState(); // Reset hoàn toàn, bao gồm ẩn nút thoát
    
    message = "🎮 Trận đấu bắt đầu!";
    const playerNames = playersList.map(p => p.name).join(" vs ");
    roomInfo.textContent = `${currentRoom} (${playerNames})`;
                // Update top scoreboard
                if (playersList[0]) {
                    const p0 = playersList[0];
                    if (topLeftNameEl) topLeftNameEl.textContent = p0.name || '---';
                    if (topLeftScoreEl) topLeftScoreEl.textContent = p0.score ?? 0;
                }
                if (playersList[1]) {
                    const p1 = playersList[1];
                    if (topRightNameEl) topRightNameEl.textContent = p1.name || '---';
                    if (topRightScoreEl) topRightScoreEl.textContent = p1.score ?? 0;
                }
    draw();
});

socket.on("error", (msg) => {
    alert(msg);
});

socket.on("playerLeft", (msg) => {
    message = msg;
    // Nếu game đang diễn ra (chưa kết thúc), tự động về màn hình home
    if (!gameOver) {
        draw();
        setTimeout(() => {
            homeScreen.classList.remove("hidden");
            gameScreen.classList.add("hidden");
            resetGameState();
            currentRoom = null;
        }, 2000);
    } else {
        // Nếu game đã kết thúc, chỉ hiển thị thông báo và giữ nút thoát
        // Xóa dữ liệu game cũ nhưng giữ lại trạng thái gameOver và nút thoát
        players = {};
        ball = { x: 300, y: 200 };
        message = msg;
    // Clear top scoreboard
    if (topLeftNameEl) topLeftNameEl.textContent = '---';
    if (topRightNameEl) topRightNameEl.textContent = '---';
    if (topLeftScoreEl) topLeftScoreEl.textContent = 0;
    if (topRightScoreEl) topRightScoreEl.textContent = 0;
        draw();
    }
});

// Game Events
socket.on("update", (data) => {
    players = data.players;
    ball = data.ball;
        // update top scoreboard if available
        const ids = Object.keys(players);
        if (ids[0]) {
            const p0 = players[ids[0]];
            if (topLeftNameEl) topLeftNameEl.textContent = p0.name || '---';
            if (topLeftScoreEl) topLeftScoreEl.textContent = p0.score ?? 0;
        }
        if (ids[1]) {
            const p1 = players[ids[1]];
            if (topRightNameEl) topRightNameEl.textContent = p1.name || '---';
            if (topRightScoreEl) topRightScoreEl.textContent = p1.score ?? 0;
        }
        draw();
});

socket.on("message", (msg) => {
    message = msg;
    setTimeout(() => (message = ""), 2000);
        // show message in DOM overlay for clarity
        if (gameMessageEl) {
            gameMessageEl.textContent = msg;
            setTimeout(() => (gameMessageEl.textContent = ''), 2000);
        }
        draw();
});

socket.on("gameOver", (data) => {
    if (gameOver) return;
    gameOver = true;
    message = `🎉 ${data.winner} thắng trận!`;
    draw();
    showRestartOptions();
    showExitButton();
    if (gameMessageEl) gameMessageEl.textContent = message;
});

// Khi trận tái đấu bắt đầu
socket.on("rematchStart", () => {
    gameOver = false;
    message = "🔁 Trận đấu mới bắt đầu!";
    draw();

    // Xóa nút chơi lại và ẩn nút thoát
    const restartBtn = document.getElementById("restartBtn");
    if (restartBtn) restartBtn.remove();
    
    const exitBtn = document.getElementById("exitBtn");
    if (exitBtn) exitBtn.classList.add("hidden");
});


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 🖼️ Vẽ background trước (ảnh nằm trong thư mục public)
    if (background.complete && background.naturalHeight !== 0) {
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } else {
        background.onload = () => ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    }


    // 🎾 Vẽ bóng nổi bật màu xanh neon
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
    ctx.shadowColor = "#ff0000ff";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#ff0000ff";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#d61818ff";
    ctx.stroke();

    // Vẽ paddle
    ctx.fillStyle = CANVAS_PADDLE_COLOR;
    const ids = Object.keys(players);
    ids.forEach((id, i) => {
        const x = i === 0 ? 20 : canvas.width - 30;
        const y = players[id].y - 40;
        ctx.fillRect(x, y, 10, 80);
    });

    // Hiển thị thông báo nhỏ
    if (!gameMessageEl && message) {
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, 30);
        ctx.textAlign = "left";
    }
}

   

function showRestartOptions() {
    const container = document.getElementById("buttonContainer");
    if (!container) return;
    // If a static restart button exists in the DOM (we added one in index.html), show and wire it.
    let btn = document.getElementById("restartBtn");
    if (btn) {
        btn.classList.remove("hidden");
        btn.disabled = false;
        btn.onclick = () => {
            socket.emit("requestRematch");
            btn.disabled = true;
            message = "⏳ Đang chờ đối thủ...";
            if (gameMessageEl) gameMessageEl.textContent = message;
            draw();
        };
        return;
    }

    // Fallback: create button dynamically if not present
    btn = document.createElement("button");
    btn.id = "restartBtn";
    btn.className = "btn primary";
    btn.textContent = "Chơi lại";
    btn.onclick = () => {
        socket.emit("requestRematch");
        btn.disabled = true;
        message = "⏳ Đang chờ đối thủ...";
        if (gameMessageEl) gameMessageEl.textContent = message;
        draw();
    };

    container.appendChild(btn);
}

// Hiển thị nút thoát khi game kết thúc
// Reset trạng thái game
function resetGameState(keepExitButton = false) {
    gameOver = false;
    message = "";
    // Reset players và ball
    players = {};
    ball = { x: 300, y: 200 };
    // Xóa các nút điều khiển
    const restartBtn = document.getElementById("restartBtn");
    if (restartBtn) restartBtn.remove();
    
    // Chỉ ẩn nút thoát nếu không có yêu cầu giữ lại
    if (!keepExitButton) {
        const exitBtn = document.getElementById("exitBtn");
        if (exitBtn) exitBtn.classList.add("hidden");
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function showExitButton() {
    const exitBtn = document.getElementById("exitBtn");
    if (exitBtn) {
        exitBtn.classList.remove("hidden");
        exitBtn.onclick = () => {
            // Thông báo cho server
            socket.emit("leaveRoom");
            // Quay về màn hình home
            gameScreen.classList.add("hidden");
            homeScreen.classList.remove("hidden");
            // Reset trạng thái game và xóa dữ liệu cũ
            resetGameState();
            currentRoom = null;
        };
    }
}
