# Desktop App Assets

Place the following files in this directory:

- `icon.icns` - macOS app icon (512x512 or 1024x1024 PNG converted to icns)
- `icon.ico` - Windows app icon (for future Windows builds)
- `icon.png` - Linux app icon (for future Linux builds)

## Creating macOS Icon

```bash
# From a 1024x1024 PNG
mkdir icon.iconset
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
iconutil -c icns icon.iconset -o icon.icns
```
