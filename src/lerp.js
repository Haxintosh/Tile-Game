export class Lerp {
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  static lerp2D(a, b, t) {
    return {
      x: Lerp.lerp(a.x, b.x, t),
      y: Lerp.lerp(a.y, b.y, t),
    };
  }

  static lerp3D(a, b, t) {
    return {
      x: Lerp.lerp(a.x, b.x, t),
      y: Lerp.lerp(a.y, b.y, t),
      z: Lerp.lerp(a.z, b.z, t),
    };
  }

  static lerp4D(a, b, t) {
    return {
      x: Lerp.lerp(a.x, b.x, t),
      y: Lerp.lerp(a.y, b.y, t),
      z: Lerp.lerp(a.z, b.z, t),
      w: Lerp.lerp(a.w, b.w, t),
    };
  }
  static lerpCustom(a, b, t, custom) {
    const lerp = (start, end, t) => start + (end - start) * t;
    switch (custom) {
      case "EASE_IN":
        t = t * t; // Quadratic ease-in
        break;
      case "EASE_OUT":
        t = t * (2 - t); // Quadratic ease-out
        break;
      case "EASE_IN_OUT":
        t =
          t < 0.5
            ? 2 * t * t // Quadratic ease-in-out
            : -1 + (4 - 2 * t) * t;
        break;
      case "EASE_CUBIC_IN":
        t = t * t * t; // Cubic ease-in
        break;
      case "EASE_CUBIC_OUT":
        t = --t * t * t + 1; // Cubic ease-out
        break;
      case "EASE_CUBIC_IN_OUT":
        t =
          t < 0.5
            ? 4 * t * t * t // Cubic ease-in-out
            : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        break;
      case "BACK_OUT":
        const c1 = 1.70158;
        const c3 = c1 + 1;
        t = 1 - Math.pow(1 - t, 3) + (1 - t) * Math.sin((1 - t) * Math.PI * c3);
        break;
      default:
        // Linear easing by default
        break;
    }
    return lerp(a, b, t);
  }
}
