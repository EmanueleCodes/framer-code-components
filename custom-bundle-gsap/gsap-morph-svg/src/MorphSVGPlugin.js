/**
 * MorphSVGPlugin stub for building the bundle.
 *
 * REPLACE THIS FILE with the real MorphSVGPlugin from GSAP Club:
 * 1. Go to https://greensock.com/club/
 * 2. Download MorphSVGPlugin (e.g. from the Club GreenSock dashboard)
 * 3. Replace this file with the official MorphSVGPlugin.js (or copy its
 *    contents into this file and export as below).
 *
 * The real plugin is used like: gsap.to(path, { morphSVG: { shape: "M0,0..." } })
 */
const MorphSVGPlugin = {
  name: "morphSVG",
  init(gsap) {
    this._gsap = gsap;
  },
};

export { MorphSVGPlugin };
