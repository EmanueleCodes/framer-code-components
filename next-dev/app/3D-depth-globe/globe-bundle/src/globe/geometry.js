import { BufferGeometry, Float32BufferAttribute } from "three";

const MAX_ELEVATION = 6000;

export function coordinatesToUnitDirection(latitude, longitude) {
  const phi = ((90 - latitude) * Math.PI) / 180;
  const theta = ((90 - longitude) * Math.PI) / 180;

  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

export function scaleElevation(elevation, scalingFactor, gamma) {
  const t = Math.max(0, Math.min(1, elevation / MAX_ELEVATION));
  return Math.pow(t, gamma) * scalingFactor;
}

export function pointGeometry(samples) {
  const directions = [];
  const elevations = [];
  const landMask = [];

  for (const [lat, lon, elevation, land] of samples) {
    const [dx, dy, dz] = coordinatesToUnitDirection(lat, lon);
    directions.push(dx, dy, dz);
    elevations.push(land ? scaleElevation(elevation, 1.0, 1) : 0);
    landMask.push(land);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("direction", new Float32BufferAttribute(directions, 3));
  geometry.setAttribute("elevation", new Float32BufferAttribute(elevations, 1));
  geometry.setAttribute("land", new Float32BufferAttribute(landMask, 1));
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(new Float32Array(directions.length), 3)
  );

  return geometry;
}
