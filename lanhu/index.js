// ==UserScript==
// @name         蓝湖替换CSS变量
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  简短而有意义的描述
// @author       LZG
// @match        https://lanhuapp.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // 配置 CSS 变量数据
  const data = [
    {
      name: "a",
      variable: `
$colorPrimary: #FA5944;
$borderRadius: 20px;
  `,
    },
  ];

  // 复制代码按钮元素
  const copyBtnSelector = "#copy_code";

  // 将 variable 转换为 [['#FA5944', '$colorPrimary']] 这样的结构。如果要修改替换值只需要修改这里返回的 '$colorPrimary'。不区分 '#FA5944' 值的大小写进行替换
  const calcVariableArray = (variable) =>
    variable
      .split(";")
      .slice(0, -1)
      .map((item) => item.split(":"))
      .map((item) => [item[1].trim(), item[0].trim()]);

  (function init() {
    data.forEach((item, index) => {
      const buttonEle = document.createElement("button");
      buttonEle.innerText = item.name;
      buttonEle.style.cssText = `z-index: 9999; background: #FA5944; padding: 5px 10px; position: absolute; bottom: 100px; right: ${
        50 * index + 10
      }px;`;
      buttonEle.addEventListener("click", () => {
        handleClick(item);
      });
      document.body.appendChild(buttonEle);
    });

    const handleClick = async (item) => {
      document.querySelector(copyBtnSelector).click();

      let clipText = await navigator.clipboard.readText();
      const variableArray = calcVariableArray(item.variable);

      variableArray.forEach((i) => {
        clipText = clipText.replaceAll(new RegExp(i[0], "ig"), i[1]);
      });

      navigator.clipboard.writeText(clipText);
    };
  })();
})();
