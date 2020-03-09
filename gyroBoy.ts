let speed = 0
let direction = 0
let fallen = false
let rightMotor = motors.largeA
let leftMotor = motors.largeD
let arms = motors.mediumC
let gyroSensor = sensors.gyro2

function reset() {
  speed = 0
  direction = 0
  // reset Motors
  rightMotor.setRegulated(false)
  rightMotor.reset()
  leftMotor.setRegulated(false)
  leftMotor.reset()
  arms.setRegulated(true)

  // reset sensors
  gyroSensor.reset()
  gyroSensor.rate()
}

function stop() {
  speed = 0
  direction = 0
}

function left() {
  turn(50)
}

function right() {
  turn(-50)
}

function forward() {
  setSpeed(7)
}

function backward() {
  setSpeed(-7)
}

function setSpeed(v: number) {
  if (v > 10) v = 10 // Limit speed
  if (v < -10) v = -10
  speed = v
}

function increaseSpeed(v: number) {
  setSpeed(speed + v)
}

function decreaseSpeed(v: number) {
  setSpeed(speed - v)
}

function turn(d: number) {
  if (d > 50) d = 50
  if (d < -50) d = -50
  direction = d
}

function moveArms() {
  arms.run(30, 30, MoveUnit.Degrees)
  arms.run(-30, 60, MoveUnit.Degrees)
  arms.run(30, 30, MoveUnit.Degrees)
}

function calibrateGyroSpeed() {
  let gyro = 0
  let gSum = 0
  let gMn = 1000
  let gMx = -100
  while (gMx - gMn > 2) {
    for (let i = 0; i < 200; i++) {
      gyro = sensors.gyro2.rate()
      gSum = gyro
      gMx = Math.max(gMx, gyro)
      gMn = Math.max(gMn, gyro)
      pause(4)
    }
  }
  return gSum / 200
}

function isFallen(pwr: number) {
  let fullspeed = Math.abs(pwr) >= 100
  if (!fullspeed) control.timer2.reset()
  if (control.timer2.seconds() > 2) return true
  return false
}

function shutDown() {
  motors.stopAll()
  brick.setStatusLight(StatusLight.RedPulse)
  brick.showImage(images.eyesKnockedOut)
  music.playSoundEffect(sounds.movementsSpeedDown)
  sensors.touch3.pauseUntil(ButtonEvent.Pressed)
  brick.setStatusLight(StatusLight.Off)
}

function getTimeDifference(cLo: number) {
  let dt = 0.014
  if (cLo == 0) {
    control.timer1.reset()
  } else {
    dt = control.timer1.seconds() / cLo
  }
  return dt
}

let ready = false

function balanceAndDrive() {
  brick.showImage(images.eyesSleeping)
  reset()
  let cLo = 0
  let gAng = 0 // gyro angle in degrees
  let gSpd = 0 // gyro angle speed in degrees/sec
  let mPos = 0 // Rotation angle of motor in degrees
  let mSpd = 0 // Rotation speed of motor in degrees/sec
  let mSum = 0
  let mD = 0
  let mDP1 = 0
  let mDP2 = 0
  let mDP3 = 0
  let pwr = 0 // motor power in [-100,100]
  let loopCount = 0 // postpone activation of the motors until dt in the loop is stable
  let offset = 0.0005
  let gOS = calibrateGyroSpeed()
  gAng = -0.25 // Start angle when sitting on support

  music.playSoundEffect(sounds.movementsSpeedUp)
  brick.showImage(images.eyesAwake)

  while (!sensors.touch3.isPressed() && !isFallen(pwr)) {
    let dt = getTimeDifference(cLo)
    cLo += 1
    let execStart = control.timer1.millis()

    // Get gyro angle and speed
    let gyro = sensors.gyro2.rate()
    gOS = offset * gyro + (1 - offset) * gOS
    gSpd = gyro - gOS
    gAng = gAng + gSpd * dt // integrate angle speed to get angle

    // Get motor rotation angle and rotational angle speed
    let mSumOld = mSum
    mSum = rightMotor.angle() + leftMotor.angle()
    mD = mSum - mSumOld
    mPos = mPos + mD
    mSpd = (mD + mDP1 + mDP2 + mDP3) / 4 / dt // motor rotational speed
    mDP3 = mDP2
    mDP2 = mDP1
    mDP1 = mD

    // Compute new motor power
    mPos = mPos - speed //* dt // make GyroBoy go forward or backward
    pwr = 0.08 * mSpd + 0.12 * mPos + 0.8 * gSpd + 15 * gAng
    //pwr = 0.8 * gSpd + 15 * gAng + (0.095 * mSpd + 0.13 * mPos) //- 0.01 * speed
    if (pwr > 100) pwr = 100
    if (pwr < -100) pwr = -100

    let rpwr = pwr - direction //* 0.1
    let lpwr = pwr + direction //* 0.1
    if (ready) {
      rightMotor.run(rpwr)
      leftMotor.run(lpwr)
    }

    let executionTime = execStart - control.timer1.millis()
    pause(Math.max(1, 10 - executionTime))
    loopCount++
    if (loopCount == 10) ready = true // skip first 10 iterations
  }
  shutDown()
}

forever(balanceAndDrive)

let sequence = true
forever(function() {
  if (ready) {
    if (sensors.color1.color() == ColorSensorColor.White) {
      pause(6000)
      setSpeed(70)
      pause(2000)
      setSpeed(1)
      for (let i = 0; i < 5; i++) {
        increaseSpeed(1)
        pause(200)
      }
      pause(2000)
      stop()
      setSpeed(40)
      left()
      pause(2000)
      stop()
      pause(3000)
      right()
      pause(2000)
      stop()
      pause(500)
      setSpeed(5)
      for (let i = 0; i < 10; i++) {
        decreaseSpeed(1)
        pause(500)
      }
      pause(1000)
      setSpeed(8)
      turn(15)
      pause(5000)
      left()
      pause(1500)
      stop()
      music.playTone(2000, 100)
    }
    if (sensors.color1.color() == ColorSensorColor.Green) {
      music.playTone(2000, 100)
      forward()
      pause(3000)
      stop()
    }
    if (sensors.color1.color() == ColorSensorColor.Blue) {
      music.playTone(2000, 100)
      left()
      pause(375)
      stop()
    }
    if (sensors.color1.color() == ColorSensorColor.Yellow) {
      music.playTone(2000, 100)
      right()
      pause(375)
      stop()
    }
    if (sensors.color1.color() == ColorSensorColor.Red) {
      music.playTone(2000, 100)
      backward()
      pause(3000)
      stop()
    }
    if (sensors.ultrasonic4.distance() < 25) {
      moveArms()
      backward()
      pause(1000)
      if (Math.randomRange(-1, 1) >= 1) {
        left()
      } else {
        right()
      }
      pause(300)
      music.playTone(2000, 100)
      stop()
    }
  }
})
