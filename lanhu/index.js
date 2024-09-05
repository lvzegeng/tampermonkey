// ==UserScript==
// @name         蓝湖替换CSS变量
// @namespace    http://tampermonkey.net/
// @version      0.0.9
// @description  支持 Css、Less、Sass 变量；不区分大小写；多个相同值的变量会以注释替换在后面
// @author       LZG
// @match        https://lanhuapp.com/web/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      gitlab.autosaver88.com
// @connect      *
// ==/UserScript==

(function () {
  "use strict";

  // 配置 CSS 变量数据
  const defaultData = [
    {
      name: "主题 he-pc",
      url: "https://gitlab.autosaver88.com/fe/sandwich-react/raw/beta/template/two/src/assets/scss/variables.scss",
    },
    {
      name: "主题 he-m",
      url: "https://gitlab.autosaver88.com/fe/sandwich-react/raw/beta/template/hernest-m/src/assets/scss/variables.scss",
    },
    {
      name: "主题 home-pc",
      url: "https://gitlab.autosaver88.com/fe/sandwich-react/raw/beta/template/home/src/assets/scss/variables.scss",
    },
    {
      name: "主题 home-m",
      url: "https://gitlab.autosaver88.com/fe/sandwich-react/raw/beta/template/home-m/src/assets/scss/variables.scss",
    },
  ];

  // 复制代码按钮元素
  const copyBtnSelector = "#copy_code";

  (function init() {
    const cacheMap = new Map();

    const configKey = "userInput";
    const defaultDataStr = JSON.stringify(defaultData, null, 2);
    const data = GM_getValue(configKey, defaultDataStr);

    GM_registerMenuCommand("修改 CSS 变量", (event) => {
      const modalEle = document.createElement("div");
      modalEle.style.cssText =
        "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; width: 600px; min-height: 350px; background: rgb(252, 252, 252); box-shadow: 0px 1px 2px -2px rgba(0, 0, 0, 0.16), 0px 3px 6px 0px rgba(0, 0, 0, 0.12), 0px 5px 12px 4px rgba(0, 0, 0, 0.09); padding: 10px;";
      modalEle.innerHTML = `
        <div>当前配置：</div>
        <textarea id="input-config" rows="10" style="width: 100%; border: 1px solid" ></textarea>
        <div>
          <button id="reset-btn">重置</button>
          <button id="save-btn">保存</button>
        </div>
  `;
      document.body.appendChild(modalEle);

      modalEle.querySelector("#input-config").value = data;
      modalEle.querySelector("#save-btn").addEventListener("click", () => {
        GM_setValue(configKey, modalEle.querySelector("#input-config").value);
        window.location.reload();
      });
      modalEle.querySelector("#reset-btn").addEventListener("click", () => {
        modalEle.querySelector("#input-config").value = defaultDataStr;
      });
    });

    const colors = [
      "rgb(244, 166, 159)",
      "rgb(239, 203, 158)",
      "rgb(86, 226, 222)",
      "rgb(34, 247, 176)",
      "rgb(192, 140, 234)",
      "rgb(75, 190, 216)",
    ];
    const divEle = document.createElement("div");
    divEle.style.cssText = `z-index: 9999; position: absolute; right: 10px; bottom: 10px; display: flex; flex-direction: column; gap: 10px;`;
    JSON.parse(data).forEach((item, index) => {
      const buttonEle = document.createElement("button");
      buttonEle.innerText = item.name;
      buttonEle.style.cssText = `background: ${colors[index % colors.length]}; padding: 5px 10px;`;
      buttonEle.addEventListener("click", () => {
        handleClick(item);
      });
      divEle.appendChild(buttonEle);
    });
    document.body.appendChild(divEle);

    const handleClick = async (item) => {
      if (!document.querySelector(copyBtnSelector)) {
        alert("请打开样式面板");
      }
      document.querySelector(copyBtnSelector).click();

      let clipText = await navigator.clipboard.readText();
      const variableObject = await calcVariableObject(item);

      Object.entries(variableObject).forEach(([key, value]) => {
        clipText = clipText.replaceAll(
          // 字符串后面跟着空格或者 ';'
          new RegExp(`${key}(?=\s+|;$)`, "igm"),
          value,
        );
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
        try {
          const response = await GM.xmlHttpRequest({ url: item.url });
          variable = response.responseText;
        } catch (err) {
          console.error(err);
          alert("请求主题文件异常");
          return;
        }
      }

      // 使用正则表达式去掉注释
      const cleanedCode = variable
        .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")
        .trim();

      const splitArr = cleanedCode
        .split(";")
        .slice(0, -1)
        .map((item) => item.split(":").map((i) => i.trim()));

      // 将变量值为变量的替换为具体值，因为会有循环赋值变量所以必须从后替换
      let variableValueIndex = splitArr.findLastIndex((item) =>
        item[1].startsWith("$"),
      );
      while (variableValueIndex !== -1) {
        const variableIndex = splitArr.findIndex(
          (item) => item[0] === splitArr[variableValueIndex][1],
        );
        if (variableIndex !== -1) {
          splitArr[variableValueIndex][1] = splitArr[variableIndex][1];
        }
        variableValueIndex = splitArr.findLastIndex((item) =>
          item[1].startsWith("$"),
        );
      }

      const tempResult = {};
      splitArr.forEach((item) => {
        const firstValue = item[1].toLowerCase();
        let secondValue = item[0];

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
