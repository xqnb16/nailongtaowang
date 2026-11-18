# 雨蚀神殿 · 奶龙追逐

第一人称无尽跑酷。开场先看到追兵从火把回廊冲过来，镜头转向前方后开始奔跑。穿过神庙后，雨林路线会持续生成。沿路收集金币，跳过断桥，钻过低梁，在岔口转弯。

## 本地试玩

在电脑上用 Edge 或 Chrome 打开仓库根目录的 `index.html`，可以离线运行。手机可通过 GitHub Pages 试玩，支持横屏和竖屏。手机默认使用流畅画质，可以在设置里提高画质。

### 手机操作

- 左右滑换道，上滑跳跃，下滑短暂下蹲。
- 也可以点「跳跃」或按住「下蹲」。到岔口时，点出现的方向按钮转弯。
- 按住「回头」看追兵，按住「疾跑」加速，右上角可暂停。
- 开场右下角有「跳过开场」按钮。

### 电脑操作

| 按键 | 操作 |
| --- | --- |
| A / D | 向左 / 向右横移 |
| Q / E | 在岔口左转 / 右转 |
| 空格 | 跳跃，开场时可跳过动画 |
| C | 按住下蹲 |
| Shift | 疾跑 |
| R | 按住回头看追兵 |
| 鼠标 | 调整视角 |
| Esc | 暂停 |

## 上传到 GitHub 并发布

1. 新建仓库，例如 `rainworn-temple`。压缩包已包含 README，创建时可用空仓库。
2. 解压 ZIP。通过空仓库的 **uploading an existing file** 链接，或已有仓库的 **Add file → Upload files**，把解压后的内容上传到 `main`。保留 `src/` 的文件夹结构，确保 `index.html` 在仓库根目录。输入提交说明并提交。
3. 要让别人直接在浏览器里玩，在仓库打开 **Settings → Pages**。选择 **Deploy from a branch → main → /(root)**，再点 **Save**。免费账号可以用公开仓库发布 Pages。
4. 部署完成后，从 **Settings → Pages** 复制 GitHub 给出的试玩地址。已有同名仓库时，可直接用本包更新原仓库的文件，再等 Pages 自动部署。

[GitHub 上传文件说明](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository) · [GitHub Pages 发布说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 修改源码

`src/game.js` 管理开场、操作和跑酷规则，`src/world.js` 构建神庙，`src/endless.js` 生成雨林路线并驱动追兵，`src/style.css` 控制界面样式。

修改后，在仓库根目录运行下面这条命令重新生成试玩网页，再提交改动和新版 `index.html`。只需 Node.js，无需安装依赖。

```sh
node src/build.cjs index.html
```

## 素材与许可

- [Three.js](https://threejs.org/) 使用 MIT 许可，许可原文见 [src/vendor/three-LICENSE.txt](src/vendor/three-LICENSE.txt)。
- 石墙、石地和岩石纹理来自 Poly Haven，采用 CC0。 [Mossy Stone Wall](https://polyhaven.com/a/mossy_stone_wall) · [Monastery Stone Floor](https://polyhaven.com/a/monastery_stone_floor) · [Rock Boulder Cracked](https://polyhaven.com/a/rock_boulder_cracked)
- 封面为生成图。追兵是根据提供的奶龙参考图制作的非官方 3D 模型。
