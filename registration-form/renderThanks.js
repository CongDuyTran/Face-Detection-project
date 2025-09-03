export const renderThanks = () => {
  const stepButton = document.querySelector(`.root-container > .steps-wrapper > .step-3`);
  stepButton.classList.add('active');

  const contentWrapper = document.querySelector('.root-container > .main > .content-wrapper');
  contentWrapper.innerHTML = `
    <div class="thanks">
      <img src="./assets/images/icon-thank-you.svg" alt="Icon Thank You">
      <p class="title">Lời cảm ơn!</p>
      <p class="body">
        Chúng tôi chân thành cảm ơn quý khách mời đã sử dụng dịch vụ của chúng tôi. Quý khách có thể liên hệ tới
        <a href="mailto:duy.tran@webie.com.vn">duy.tran@webie.com.vn</a>
      </p>
    </div>
  `;

  document.querySelector('.root-container > .main > div:last-child').classList.add('hidden');
};