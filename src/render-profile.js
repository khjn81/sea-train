// Inspect locally only. No renderer identity is stored or sent to the server.
export function renderProfile(gl, pixelRatio, width, forceLight = false) {
  let software = false;
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "";
    software = /swiftshader|llvmpipe|softpipe|software|swrast/i.test(name);
  } catch {
    // Restricted renderer information retains the normal scene.
  }
  const lightweight = software || forceLight;
  return {
    software,
    lightweight,
    pixelRatio: lightweight
      ? Math.min(0.25, 384 / width)
      : Math.min(pixelRatio, 1.5),
    frameInterval: lightweight ? 1000 / 12 : 0,
  };
}
