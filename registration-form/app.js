import { renderForm1 } from "./renderForm1.js";

const checkLargeDevicesScreen = x => {
    const stepButtons = document.querySelectorAll(`.root-container > .steps-wrapper > [class^='step-']`);

    if (x.matches) {
        stepButtons.forEach(btn => {
            btn.querySelector('.info').classList.remove('hidden');
        });
        // console.log('yes');
    } else {
        stepButtons.forEach(btn => {
            btn.querySelector('.info').classList.add('hidden');
        });
        // console.log('no')
    }
};

var x = window.matchMedia('(min-width: 1024px)');
checkLargeDevicesScreen(x);

x.addEventListener('change', () => checkLargeDevicesScreen(x));

renderForm1();