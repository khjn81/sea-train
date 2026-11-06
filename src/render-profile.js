// Inspect locally only. No renderer identity is stored or sent to the server.
export function renderProfile(gl, pixelRatio, width) {
  let software = false;
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "";
    software = /swiftshader|llvmpipe|softpipe|software|swrast/i.test(name);
  } catch {
    // Restricted renderer information retains the normal scene.
  }
  return {
    software,
    pixelRatio: software
      ? Math.min(0.25, 384 / width)
      : Math.min(pixelRatio, 1.5),
    frameInterval: software ? 1000 / 12 : 0,
  };
}
