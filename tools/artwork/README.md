# 状态图标绘图源

这两份程序是 2026-09-18 特性内容交付时实际使用的绘图源码，生成当前 `content/abilities/*/resources/assets/world_combat/textures/mob_effect/` 中的 13 张 18×18 图标。配色与几何保持原样，输出根目录可传入；历史文件清理命令已从绘图程序中省去。

- [group1](ability-icons-group1.cjs)：flamebody、gooey、lingeringaroma、mummy、perishbody；使用 Node.js 从像素距离函数绘制渐变圆与高光。
- [group2](ability-icons-group2.ps1)：forewarn、frisk、grassysurge、hospitality、intimidate、intrepidsword、klutz、mistysurge；使用 Windows PowerShell / System.Drawing 绘制椭圆、边缘与高光。

两组均直接绘制图像，不需要输入素材。具体调色和文件名在各自源码中。

需要重新生成时，在仓库根运行以下命令。默认覆盖对应单元的图标；也可以传入单独的输出目录：

```powershell
node tools/artwork/ability-icons-group1.cjs
powershell -NoProfile -File tools/artwork/ability-icons-group2.ps1
```

Node 程序接受第一个参数作为输出根；PowerShell 程序接受 `-OutputRoot`。输出保留 `<特性>/resources/assets/world_combat/textures/mob_effect/` 层级。
