const { chromium } = require("playwright");

const transformV2 = (obj) => {
  const result = {};

  const iterate = (obj, path) => {
    Object.keys(obj).forEach((key) => {
      const fullPath = `${path}${path === "" ? "" : "."}${key}`;
      const value = String(obj[key]).replace("<c>", "").replace("</c>", "");

      if (typeof obj[key] === "object" && obj[key] !== null) {
        iterate(obj[key], fullPath);
      } else {
        if (Array.isArray(result[value])) {
          result[value].push(fullPath);
        } else {
          result[value] = [fullPath];
        }
      }
    });
  };

  iterate(obj, "");

  return result;
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({
    width: 3840,
    height: 2160,
  });
  await page.goto("https://pp.grubhub.com/login");
  await page.getByTestId("email-input").fill("ayw@l.io");
  await page.getByTestId("password-input").fill("testing123");

  const responsePromise = page.waitForResponse(/subscription\/all/);

  await page.getByTestId("sign-in-btn").click();

  await page.locator("#backdrop").click();

  const response = await (await responsePromise).json();
  const v2Object = response?.subscriptions[0]?.texts;

  const transformedV2 = transformV2(v2Object);

  await page.getByTestId("mini-bar-upsell").click();
  await page.waitForTimeout(10000);

  await page.evaluate((v2) => {
    function generateColor() {
      return [...(_ = "facedb")].reduce(
        (x) => x + (_ + 0x3d00b615)[~~(Math.random() * 16)],
        "#"
      );
    }

    function replaceTextNodes(node) {
      node.childNodes.forEach(function (el) {
        if (el.nodeType === 3) {
          if (el.nodeValue.trim() !== "") {
            const color = generateColor();

            const v2fields = Array.isArray(v2[el.nodeValue])
              ? v2[el.nodeValue].reduce((acc, curr) => {
                  return `${acc}<div style="font-size: 10px;color: ${color};">${curr}<div>`;
                }, "")
              : "";

            const replacementNode = document.createElement("span");
            replacementNode.style.display = "inline-block";
            replacementNode.style.padding = "4px";
            replacementNode.style.border = `1px solid ${color}`;
            replacementNode.innerHTML = `<div>${el.nodeValue}<div>${v2fields}`;

            el.parentNode.insertBefore(replacementNode, el);
            el.parentNode.removeChild(el);
          }
        } else {
          replaceTextNodes(el);
        }
      });
    }
    replaceTextNodes(
      document.querySelector('[data-testid="subscription-checkout"]')
    );
  }, transformedV2);

  await page.waitForTimeout(1000);
  await page.screenshot({ path: `screenshots/checkout.png` });
  await browser.close();
})();
