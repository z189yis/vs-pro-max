# VS Pro Max

A vampire survivors style browser game.

## Play Online

Visit: `https://<your-github-username>.github.io/vs-pro-max/`

## Local Development

```bash
npm run dev
# or
python -m http.server 8080
```

Then open `http://localhost:8080`.

> Important: This project uses ES modules. You must serve it over HTTP/HTTPS instead of opening `index.html` directly with `file://`.

## Deploy to GitHub Pages

1. Create a new repository on GitHub (e.g. `your-username/vs-pro-max`).
2. Add GitHub as a remote and push:
   ```bash
   git remote add github https://github.com/your-username/vs-pro-max.git
   git push github master
   ```
3. On GitHub, go to **Settings → Pages → Build and deployment**.
4. Select **GitHub Actions** as the source.
5. The workflow `.github/workflows/deploy.yml` will deploy automatically.
6. After the workflow finishes, visit `https://your-username.github.io/vs-pro-max/`.

## Mobile Play

Open the deployed URL in any modern mobile browser (Chrome / Safari). The game supports touch controls including a virtual joystick.
