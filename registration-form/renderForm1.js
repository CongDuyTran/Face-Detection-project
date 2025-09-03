import { renderForm2 } from "./renderForm2.js";

const isFormValidated = (name, email, phone) => {
  try {
    const errName = document.querySelector('.root-container > .main > .content-wrapper > form.step-1 > .input > .name > p.error-validation');
    const errEmail = document.querySelector('.root-container > .main > .content-wrapper > form.step-1 > .input > .email > p.error-validation');
    const errPhone = document.querySelector('.root-container > .main > .content-wrapper > form.step-1 > .input > .phone > p.error-validation');

    let isValidated = true;
    if (!name) {
      errName.classList.remove('hidden');
      errName.classList.add('active');
      errName.textContent = 'Vui lòng điền đầy đủ họ tên';
      isValidated = false;
    } else {
      errName.classList.remove('active');
      errName.classList.add('hidden');
    }
    
    if (!email) {
      errEmail.classList.remove('hidden');
      errEmail.classList.add('active');
      errEmail.textContent = 'Vui lòng điền email';
      isValidated = false;
    } else if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      errEmail.classList.remove('hidden');
      errEmail.classList.add('active');
      errEmail.textContent = 'Email không hợp lệ';
      isValidated = false;
    } else {
      errEmail.classList.remove('active');
      errEmail.classList.add('hidden');
    }
    
    if (!phone) {
      errPhone.classList.remove('hidden');
      errPhone.classList.add('active');
      errPhone.textContent = 'Vui lòng điền số điện thoại';
      isValidated = false;
    } else if (!phone.match(/^(0)(3[2-9]|5[6,8,9]|7[0,6-9]|8[1-6,8,9]|9[0-4,6-9])[0-9]{7}$/)) {
      errPhone.classList.remove('hidden');
      errPhone.classList.add('active');
      errPhone.textContent = 'Số điện thoại không hợp lệ';
      isValidated = false;
    } else {
      errPhone.classList.remove('active');
      errPhone.classList.add('hidden');
    }
  
    return isValidated;
  } catch {}
};

export const renderForm1 = () => {
  const stepButton = document.querySelector(`.root-container > .steps-wrapper > .step-1`);
  const contentWrapper = document.querySelector('.root-container > .main > .content-wrapper');
  
  stepButton.classList.add('active');

  contentWrapper.innerHTML = `
    <form id="form" class="step-1">
      <p class="title">Thông tin cá nhân</p>
      <p class="intro">Vui lòng điền đầy đủ các thông tin được yêu cầu dưới đây</p>
      <div class="input">
        <div class="name">
          <label for="name">Họ và tên</label>
          <p class="error-validation hidden"></p>
          <input id="name" name="name" placeholder="Ví dụ: Nguyễn Văn A"/>
        </div>
        <div class="email">
          <label for="email">Email</label>
          <p class="error-validation hidden"></p>
          <input id="email" name="email" placeholder="Ví dụ: abc@gmail.com"/>
        </div>
        <div class="phone">
          <label for="phone">Số điện thoại</label>
          <p class="error-validation hidden"></p>
          <input id="phone" name="phone" placeholder="Ví dụ: 0123456789"/>
        </div>
      </div>
    </form>
  `;

  const form = document.getElementById('form');
  form.addEventListener('submit', async (e) => {
    try {
      e.preventDefault();
      
      const stepButton = document.querySelector(`.root-container > .steps-wrapper > .step-1`);
      
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const phone = document.getElementById('phone').value;

      
      if (isFormValidated(name, email, phone)) {
        // submit via axios, fetch, ajax
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('phone_number', phone);

        await axios.post('http://localhost:8000/api/v1/users', formData);

        stepButton.classList.remove('active');

        const userInfo = {
          name: name,
          email: email,
          phone: phone
        };

        renderForm2(userInfo);
      } else {
        alert('try again');
      }
    } catch {
      alert('Email đã tồn tại, vui lòng thử lại!');
    }
  });

  // document.getElementById('submit').addEventListener('click', e => {
    // e.preventDefault();
    // stepButton.classList.remove('active')
    // renderForm2(null);
  // })
};