# 发布清单（维护者用）

这份文件不会随 tarball 发布，只用于把仓库整理成可公开的状态。

## 1. 已完成

- GitHub 用户名 `skyrocks` 已写入 `README.md` / `README.en.md`。
- `package.json` 已包含 `repository` / `homepage` / `bugs`。

## 2. 检查

```sh
grep -n "YOUR_GITHUB_NAME" README.md README.en.md package.json
```

应无输出。

## 3. 上传

仓库根目录是 **本目录的内容**（`package.json` 与 `cordis.patch.yml` 在根），
不要把外层父目录一起上传，否则 `github:skyrocks/dsh-go-quota` 安装会找不到插件清单。

本地已经初始化并提交，`main` 分支和 `v0.1.6` tag 都在：

```sh
git remote add origin git@github.com:skyrocks/dsh-go-quota.git
git push -u origin main
git push origin v0.1.6
```

如果机器上没登录过 GitHub CLI：

```sh
gh auth login
gh repo create skyrocks/dsh-go-quota --public --source=. --remote=origin --push
git push origin v0.1.6
```

## 4. Release

tag 已创建。推上去之后用 CLI 发 Release 并附上 tarball：

```sh
pnpm pack                     # 生成 dsh-go-quota-0.1.6.tgz
gh release create v0.1.6 ./dsh-go-quota-0.1.6.tgz \
  --title "v0.1.6" --generate-notes
```

也可以在网页上创建 Release，正文直接用 `CHANGELOG.md` 的对应段落。

## 5. 发布前检查

- [x] `node test/smoke.mjs` 通过（8 项）
- [x] `node --check client.js` 通过
- [ ] CI 在 Ubuntu / macOS / Windows 上全绿（推送后自动跑）
- [x] README 里的预览图已改为 PNG（`docs/preview-*.png`）
- [x] `grep -n "YOUR_GITHUB_NAME" README.md README.en.md package.json` 无输出
- [ ] 安装路径实测：弹窗粘贴 `github:skyrocks/dsh-go-quota` 后完全退出重启
- [ ] Release 附件与 `package.json` 版本一致

## 6. 可选：发布到 npm

```sh
npm login
npm publish --access public
```

发布前确认包名 `dsh-go-quota` 未被占用；`private` 已移除，`files` 只包含运行所需文件。
