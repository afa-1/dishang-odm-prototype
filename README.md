# 迪尚 ODM · AI 协作原型

基于深服设计端原型完善的前端演示系统，围绕「项目 → 任务 → 资产 → 交付」串联客户、品牌和 AI 协作能力。

## 运行

需要 Node.js 22（或兼容 Vite 7 的版本）。

```sh
npm ci
npm run dev -- --port 4173
```

打开 http://localhost:4173/?view=projects 。

## 演示内容

- 四个项目 Tab：概览、任务、资产、交付；支持从模板创建项目。
- 客户与品牌档案、可选项目关联、公共资料归集与跨项目引用。
- 技能、专家、专家团和连接器的统一入口及项目配置。
- Brief、趋势企划、搜款搜料任务演示；确认、执行、预览、归档和人工修订。
- 参考图进入设计画布、款料关联、内部选款和交付确认。

AI 执行、连接器及 PLM 均为明确标注的演示，不连接真实业务后台。文件及编辑记录只保存在当前浏览器，不能替代业务资料备份。勿在公开演示中使用保密资料。

## 发布 GitHub Pages

工作流：`.github/workflows/pages.yml`。在仓库 **Settings → Pages** 将 Source 设为 **GitHub Actions**，推送 `main` 后自动发布。

```sh
VITE_BASE_PATH=/dishang-odm-prototype/ npm run build
VITE_BASE_PATH=/dishang-odm-prototype/ npm run preview -- --port 4174
```

子目录路径下的路由、示例图片和页面刷新已做适配。更换仓库名称时，修改工作流中的 `VITE_BASE_PATH`。

更多交互规则、原型边界及演示路径见 [项目模块说明](docs/项目模块说明.md)。
