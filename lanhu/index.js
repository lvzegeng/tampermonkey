// ==UserScript==
// @name         蓝湖替换CSS变量
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  支持 Css、Less、Sass 变量；不区分大小写；多个相同值的变量会以注释替换在后面
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
// 注释
$colorPrimary: #FA5944; //注释
/* 注释 */
$borderRadius: 20px; /*注释*/
  `,
    },
  ];

  // 复制代码按钮元素
  const copyBtnSelector = "#copy_code";

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
      const variableObject = calcVariableObject(item.variable);

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
    const calcVariableObject = (variable) => {
      // 使用正则表达式去掉注释
      const cleanedCode = variable
        .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")
        .trim();

      const tempResult = {}

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

          tempResult[firstValue] ??= []

          tempResult[firstValue].push(secondValue)
        });

      const result = {}
      Object.entries(tempResult).map(([key, value])=> {
        result[key] = value.length === 1? value[0]: `${value[0]} /* ${value.slice(1).join(', ')} */`
      })

      return result
    };
  })();
})();
