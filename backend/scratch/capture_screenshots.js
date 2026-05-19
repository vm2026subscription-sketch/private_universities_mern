const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'C:\\Users\\ankur\\Downloads\\vm_private_universities\\private_universities_mern\\backend\\scratch\\screenshot_home.png', fullPage: true });
    
    // Check other pages
    await page.goto('http://localhost:5173/universities', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'C:\\Users\\ankur\\Downloads\\vm_private_universities\\private_universities_mern\\backend\\scratch\\screenshot_universities.png', fullPage: true });

    await browser.close();
    console.log('Screenshots saved successfully.');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  }
})();
