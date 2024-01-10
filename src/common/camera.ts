export default class Camera {
  coords: number[];
  startingRotation: number;
  minClamp: number;
  maxClamp: number;

  constructor(
    coords: number[],
    startingRotation: number,
    minClamp: number,
    maxClamp: number
  ) {
    this.coords = coords;
    this.startingRotation = startingRotation;
    this.minClamp = minClamp;
    this.maxClamp = maxClamp;
  }
}
