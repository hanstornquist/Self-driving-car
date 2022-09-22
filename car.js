class Car {
  constructor(x, y, widht, height, controleType, maxSpeed = 1) {
    this.x = x;
    this.y = y;
    this.widht = widht;
    this.height = height;

    this.speed = 0;
    this.acceleration = 0.05;
    this.maxSpeed = maxSpeed;
    this.friction = 0.02;
    this.rotationSpeed = 0.015;
    this.angle = 0;
    this.damaged = false;

    this.useBrain = controleType == "AI";

    if (controleType != "DUMMY") {
      this.sensor = new Sensor(this);
      this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]);
    }
    this.controlls = new Controlls(controleType);
  }

  update(roadBorders, traffic) {
    if (!this.damaged) {
      this.#move();
      this.polygon = this.#createPolygon();
      this.damaged = this.#assessDamage(roadBorders, traffic);
    }
    if (this.sensor) {
      this.sensor.update(roadBorders, traffic);
      const offsets = this.sensor.readings.map((s) =>
        s == null ? 0 : 1 - s.offset
      );

      const outputs = NeuralNetwork.feedForward(offsets, this.brain);

      if (this.useBrain) {
        this.controlls.forward = outputs[0];
        this.controlls.left = outputs[1];
        this.controlls.right = outputs[2];
        this.controlls.reverse = outputs[3];
      }
    }
  }

  #assessDamage(roadBorders, traffic) {
    for (let i = 0; i < roadBorders.length; i++) {
      if (polysInstersect(this.polygon, roadBorders[i])) {
        return true;
      }
    }

    for (let i = 0; i < traffic.length; i++) {
      if (polysInstersect(this.polygon, traffic[i].polygon)) {
        return true;
      }
    }

    return false;
  }

  #createPolygon() {
    const points = [];
    const rad = Math.hypot(this.widht, this.height) / 2;
    const alpha = Math.atan2(this.widht, this.height);

    points.push({
      x: this.x - Math.sin(this.angle - alpha) * rad,
      y: this.y - Math.cos(this.angle - alpha) * rad,
    });

    points.push({
      x: this.x - Math.sin(this.angle + alpha) * rad,
      y: this.y - Math.cos(this.angle + alpha) * rad,
    });

    points.push({
      x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad,
    });

    points.push({
      x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad,
    });

    return points;
  }

  #move() {
    if (this.controlls.forward) this.speed += this.acceleration;
    if (this.controlls.reverse) this.speed -= this.acceleration;

    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;

    if (this.speed > 0) this.speed -= this.friction;
    if (this.speed < 0) this.speed += this.friction;
    if (Math.abs(this.speed) < this.friction) this.speed = 0;

    if (this.speed !== 0) {
      const flip = this.speed > 0 ? 1 : -1;
      if (this.controlls.left) this.angle += this.rotationSpeed * flip;
      if (this.controlls.right) this.angle -= this.rotationSpeed * flip;
    }

    this.x -= Math.sin(this.angle) * this.speed;
    this.y -= Math.cos(this.angle) * this.speed;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx, color) {
    if (this.damaged) ctx.fillStyle = "gray";
    else ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(this.polygon[0].x, this.polygon[0].y);

    for (let i = 1; i < this.polygon.length; i++) {
      ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
    }
    ctx.fill();
    if (this.sensor) this.sensor.draw(ctx);
  }
}
