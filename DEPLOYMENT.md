# GitHub Pages Deployment Guide

## Quick Setup

1. **Create GitHub Repository**
   ```bash
   # Initialize git repository
   git init
   git add .
   git commit -m "feat: Complete Israel earthquake interactive map with filtering and visualization"
   
   # Add remote repository (replace [username] with your GitHub username)
   git remote add origin https://github.com/[username]/israel-map.git
   git branch -M main
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** tab
   - Scroll down to **Pages** section
   - Under **Source**, select **Deploy from a branch**
   - Choose **main** branch and **/ (root)** folder
   - Click **Save**

3. **Access Your Live Site**
   - Your site will be available at: `https://[username].github.io/israel-map/`
   - Initial deployment may take 5-10 minutes

## File Structure (GitHub Pages Ready)

```
israel-map/
├── index.html              # Entry point (required)
├── _config.yml             # GitHub Pages configuration
├── README.md               # Repository documentation
├── LICENSE                 # MIT License
├── .gitignore             # Git ignore rules
├── DEPLOYMENT.md          # This deployment guide
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── map.js
│   ├── filters.js
│   ├── statistics.js
│   └── table.js
├── data/
│   └── all_EQ_cleaned.geojson
└── assets/
    └── icons/
        └── circular-target.png
```

## Verification Checklist

- ✅ All files use relative paths (no localhost references)
- ✅ External CDN resources use HTTPS
- ✅ No server-side dependencies
- ✅ All assets are included in repository
- ✅ MIME types are web-standard (HTML, CSS, JS, JSON, PNG)

## Troubleshooting

**Site not loading?**
- Check GitHub Pages settings are enabled
- Verify main branch is selected
- Wait 5-10 minutes for initial deployment

**Map not displaying?**
- Ensure data/all_EQ_cleaned.geojson is committed
- Check browser console for CORS errors
- Verify all external CDN links are HTTPS

**Styling issues?**
- Check CSS file paths are relative
- Verify assets/icons/ directory is committed
- Test on different browsers

## Custom Domain (Optional)

1. Add `CNAME` file to repository root:
   ```
   your-domain.com
   ```

2. Configure DNS with your domain provider:
   ```
   Type: CNAME
   Name: www (or @)
   Value: [username].github.io
   ```

## Performance Tips

- GitHub Pages includes automatic compression
- CDN resources are cached globally
- Static files load efficiently
- No server-side processing needed

## Support

- GitHub Pages Documentation: https://docs.github.com/en/pages
- MapLibre GL JS Documentation: https://maplibre.org/
- Repository Issues: Create an issue for bugs or feature requests
