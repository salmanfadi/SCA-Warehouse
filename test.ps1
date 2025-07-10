Remove-Item unused_files.md -ErrorAction SilentlyContinue

Get-Content .\src_usage_unused.txt | ForEach-Object {
    $fullPath = $_.Trim()
    $fileName = [System.IO.Path]::GetFileName($fullPath)
    # Search for the filename in all src files except itself
    $matches = Get-ChildItem -Path .\src -Recurse -File | Where-Object { $_.FullName -ne (Resolve-Path $fullPath) } | Select-String -Pattern $fileName -SimpleMatch
    if (-not $matches) {
        Add-Content unused_files.md $fullPath
    }
}