export function showGraphicsFailure(reason = 'initial') {
  const title = reason === 'lost' ? '잠시 3D 화면이 멈췄어요' : '3D 기차를 열 수 없어요';
  const detail = reason === 'lost'
    ? '다시 열면 기차를 새로 둘러볼 수 있어요. 다른 탭을 닫으면 도움이 될 수 있어요.'
    : '브라우저의 3D 기능이 꺼져 있거나 사용할 수 없는 상태예요. 다른 브라우저에서도 시도해 보세요.';
  const app = document.querySelector('#app');
  app.innerHTML = `<main class="graphics-fallback"><section role="alert"><p class="fallback-brand">바다행</p><h1>${title}</h1><p>${detail}</p><button type="button">다시 열기</button></section></main>`;
  const retry = app.querySelector('button');
  retry.onclick = () => location.reload();
  retry.focus();
}
