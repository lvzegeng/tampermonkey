// ==UserScript==
// @name         蓝湖替换CSS变量
// @namespace    http://tampermonkey.net/
// @version      0.0.4
// @description  支持 Css、Less、Sass 变量；不区分大小写；多个相同值的变量会以注释替换在后面
// @author       LZG
// @match        https://lanhuapp.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      gitlab.autosaver88.com
// ==/UserScript==

(function () {
  "use strict";

  // 配置 CSS 变量数据
  const defaultData = [
    {
      name: "主题a",
      variable: `
// 注释
$colorPrimary: #FA5944; //注释
$colorPrimary2: #FA5944;
/* 注释 */
$borderRadius: 20px; /*注释*/
  `,
    },
    {
      name: "主题b",
      url: "https://gitlab.autosaver88.com/fe/sandwich-react/raw/beta/template/two/src/assets/scss/variables.scss",
    },
  ];

  // 复制代码按钮元素
  const copyBtnSelector = "#copy_code";

  (function init() {
    const cacheMap = new Map();
    const colors = [
      "rgb(244, 166, 159)",
      "rgb(239, 203, 158)",
      "rgb(86, 226, 222)",
      "rgb(34, 247, 176)",
      "rgb(192, 140, 234)",
      "rgb(75, 190, 216)",
    ];

    const configKey = "userInput";
    const data = GM_getValue(configKey, defaultData);

    GM_registerMenuCommand("修改 CSS 变量", (event) => {
      const userInput = prompt("请输入你的配置文本：", JSON.stringify(data));

      if (userInput) {
        GM_setValue(configKey, JSON.parse(userInput));
        window.location.reload();
      }
    });

    data.forEach((item, index) => {
      const buttonEle = document.createElement("button");
      buttonEle.innerText = item.name;
      buttonEle.style.cssText = `z-index: 9999; background: ${colors[index % colors.length]}; padding: 5px 10px; position: absolute; right: 10px; bottom: ${
        40 * index + 10
      }px;`;
      buttonEle.addEventListener("click", () => {
        handleClick(item);
      });
      document.body.appendChild(buttonEle);
    });

    const handleClick = async (item) => {
      document.querySelector(copyBtnSelector).click();

      let clipText = await navigator.clipboard.readText();
      const variableObject = calcVariableObject(item);

      Object.entries(variableObject).forEach(([key, value]) => {
        clipText = clipText.replaceAll(new RegExp(key, "ig"), value);
      });

      navigator.clipboard.writeText(clipText);
    };

    // 将 variable 转换为这样的结构
    // {
    //     "#fa5944": "$colorPrimary /* $colorPrimary2, $colorPrimary23 */",
    //     "#fa5944": "calc(--colorPrimary) /* calc(--colorPrimary2), calc(--colorPrimary23) */"
    //     "20px": "$borderRadius"
    // }
    const calcVariableObject = async (item) => {
      if (cacheMap.get(item)) {
        return cacheMap.get(item);
      }

      let variable = item.variable;
      if (item.url) {
        const response = await GM.xmlHttpRequest({ url: item.url });
        variable = response.responseText;
      }

      // 使用正则表达式去掉注释
      const cleanedCode = variable
        .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")
        .trim();

      const tempResult = {};

      cleanedCode
        .split(";")
        .slice(0, -1)
        .map((item) => item.split(":"))
        .forEach((item) => {
          const firstValue = item[1].trim().toLowerCase();
          let secondValue = item[0].trim();

          if (secondValue.startsWith("--")) {
            secondValue = `calc(${secondValue})`;
          }

          tempResult[firstValue] ??= [];

          tempResult[firstValue].push(secondValue);
        });

      const result = {};
      Object.entries(tempResult).map(([key, value]) => {
        result[key] =
          value.length === 1
            ? value[0]
            : `${value[0]} /* ${value.slice(1).join(", ")} */`;
      });

      cacheMap.set(item, result);
      return result;
    };
  })();
})();
