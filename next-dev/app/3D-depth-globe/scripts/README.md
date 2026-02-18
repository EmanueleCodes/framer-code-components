# Globe data scripts

## Get full data on GitHub (without opening the file)

The full JSON files are ~71–72 MB. **Do not open them in an editor.** Use the terminal:

```bash
# From your repo root (framer-code-components)
git add next-dev/app/3D-depth-globe/source/src/data/globe_samples_50m_0.1.json
git commit -m "Add full globe data (50m)"
git push origin main
```

Then the **raw URL** (replace `USER`, `REPO`, `BRANCH` with yours) is:

```
https://raw.githubusercontent.com/USER/REPO/BRANCH/next-dev/app/3D-depth-globe/source/src/data/globe_samples_50m_0.1.json
```

Use that URL as the **Data URL** in the 3D Depth Globe component.

- **50m:** `globe_samples_50m_0.1.json` (~71 MB) – recommended, full detail.
- **10m:** `globe_samples_10m_0.1.json` (~72 MB) – same size, slightly different resolution.

GitHub allows files under 100 MB, so both are fine.

---

## Downsample for a smaller file (~8 MB)

If you want a smaller file for faster loading:

```bash
cd next-dev/app/3D-depth-globe/scripts
node downsample-globe-data.js 8
```

Output: `next-dev/public/globe-data-medium.json`. Upload that to GitHub and use its raw URL.

| everyN | Approx size |
|--------|-------------|
| 4      | ~17 MB      |
| 8      | ~8 MB       |
| 16     | ~4 MB       |
