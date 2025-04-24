// 獲取 Canvas 元素
const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

// Serial 通訊變數
let port;
let reader;
let lastSensorValue = 0;
let currentSensorValue = 0;
const SENSITIVITY = 2; // 靈敏度閾值

// 設置初始參數
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;
let fireworks = [];
let particles = [];

// 煙火粒子類
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 2 + 1;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 5 + 2;
        this.dx = Math.cos(angle) * velocity;
        this.dy = Math.sin(angle) * velocity;
        this.alpha = 1;
        this.life = Math.random() * 0.5 + 0.5;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.dy += 0.1;
        this.alpha -= 0.01;
        this.life -= 0.01;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.fill();
    }
}

// 煙火類
class Firework {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        const angle = Math.atan2(targetY - y, targetX - x);
        const velocity = 15;
        this.dx = Math.cos(angle) * velocity;
        this.dy = Math.sin(angle) * velocity;
        this.radius = 2;
        this.color = `${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)}`;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${this.color})`;
        ctx.fill();
    }

    explode() {
        const particleCount = 100;
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(this.x, this.y, this.color));
        }
    }

    hasReached() {
        const distance = Math.hypot(this.x - this.targetX, this.y - this.targetY);
        return distance < 5;
    }
}

// 動畫函數
function animate() {
    // 設置半透明的清除效果
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    // 更新和繪製煙火
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw();

        if (fireworks[i].hasReached()) {
            fireworks[i].explode();
            fireworks.splice(i, 1);
        }
    }

    // 更新和繪製粒子
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();

        if (particles[i].alpha <= 0 || particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    requestAnimationFrame(animate);
}

// Arduino 連接功能
async function connectToArduino() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        
        console.log('Arduino 已連接');
        
        const decoder = new TextDecoder();
        reader = port.readable.getReader();
        
        while (true) {
            try {
                const { value, done } = await reader.read();
                if (done) {
                    reader.releaseLock();
                    break;
                }
                
                const data = decoder.decode(value).trim();
                const lines = data.split('\n');
                
                for (const line of lines) {
                    const sensorValue = parseInt(line);
                    if (!isNaN(sensorValue) && sensorValue >= 0 && sensorValue <= 1023) {
                        console.log('當前感測器值:', sensorValue, '上次感測器值:', lastSensorValue, '差值:', Math.abs(sensorValue - lastSensorValue));
                        currentSensorValue = sensorValue;
                        
                        // 檢測旋轉變化
                        if (Math.abs(currentSensorValue - lastSensorValue) > SENSITIVITY) {
                            console.log('觸發煙火！');
                            // 創建新的煙火
                            const startX = Math.random() * width;
                            const startY = height;
                            const targetX = Math.random() * width;
                            const targetY = height * 0.2 + Math.random() * (height * 0.5);
                            fireworks.push(new Firework(startX, startY, targetX, targetY));
                            
                            // 更新上一次的值
                            lastSensorValue = currentSensorValue;
                        }
                    }
                }
            } catch (error) {
                console.log('數據讀取錯誤:', error);
            }
        }
    } catch (error) {
        console.log('Arduino 連接錯誤:', error);
    }
}

// 處理視窗大小變化
window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

// 添加按鈕事件監聽
document.getElementById('connectButton').addEventListener('click', () => {
    console.log('連接按鈕被點擊');
    connectToArduino();
});

// 啟動動畫
animate();
