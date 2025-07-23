# Remove existing favicon files
Remove-Item -Path "public\android-*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "public\apple-*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "public\favicon-*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "public\favicon.*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "public\mstile-*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "public\safari-*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "public\site.webmanifest" -Force -ErrorAction SilentlyContinue

# Copy new favicon files
Copy-Item -Path "C:\Users\mines\Downloads\favicon_io (1)\\*" -Destination "public\" -Recurse -Force

Write-Host "Favicon files have been updated successfully!" -ForegroundColor Green
