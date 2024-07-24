const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

let basket = {
  x: canvas.width / 2 - 50,
  y: canvas.height - 30,
  width: 100,
  height: 20,
  speed: 5,
  dx: 0
};

let object = {
  x: Math.random() * (canvas.width - 20),
  y: 0,
  size: 20,
  speed: 2
};

let score = 0;

function drawBasket() {
  ctx.fillStyle = '#0095DD';
  ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
}

function drawObject() {
  ctx.beginPath();
  ctx.arc(object.x, object.y, object.size, 0, Math.PI * 2);
  ctx.fillStyle = '#0095DD';
  ctx.fill();
  ctx.closePath();
}

function moveBasket() {
  basket.x += basket.dx;

  // Wall collision
  if (basket.x < 0) {
    basket.x = 0;
  } else if (basket.x + basket.width > canvas.width) {
    basket.x = canvas.width - basket.width;
  }
}

function moveObject() {
  object.y += object.speed;

  if (object.y + object.size > canvas.height) {
    if (object.x > basket.x && object.x < basket.x + basket.width) {
      // Caught
      score++;
      resetObject();
    } else {
      // Missed
      resetObject();
    }
  }
}

function resetObject() {
  object.x = Math.random() * (canvas.width - 20);
  object.y = 0;
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBasket();
  drawObject();

  moveBasket();
  moveObject();

  requestAnimationFrame(update);
}

function keyDown(e) {
  if (e.key === 'ArrowRight' || e.key === 'Right') {
    basket.dx = basket.speed;
  } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
    basket.dx = -basket.speed;
  }
}

function keyUp(e) {
  if (e.key === 'ArrowRight' || e.key === 'Right' || e.key === 'ArrowLeft' || e.key === 'Left') {
    basket.dx = 0;
  }
}

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

update();
