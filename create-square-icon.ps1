# Script para crear icono cuadrado para Tauri
Add-Type -AssemblyName System.Drawing

$sourcePath = "..\frontend\public\jamrock-logo.png"
$outputPath = ".\icon-square-source.png"
$targetSize = 1024

Write-Host "Cargando imagen original..."
$original = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath).Path)
Write-Host "Dimensiones originales: $($original.Width)x$($original.Height)"

# Crear bitmap cuadrado
Write-Host "Creando bitmap ${targetSize}x${targetSize}..."
$bitmap = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Configurar calidad alta
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# Limpiar con transparente
$graphics.Clear([System.Drawing.Color]::Transparent)

# Calcular escala para que quepa la imagen completa con margen
$margin = 50
$availableSize = $targetSize - (2 * $margin)
$scale = [Math]::Min($availableSize / $original.Width, $availableSize / $original.Height)

# Calcular nuevas dimensiones
$newWidth = [int]($original.Width * $scale)
$newHeight = [int]($original.Height * $scale)

# Calcular posición centrada
$x = ($targetSize - $newWidth) / 2
$y = ($targetSize - $newHeight) / 2

Write-Host "Escalando y centrando imagen..."
$graphics.DrawImage($original, $x, $y, $newWidth, $newHeight)

# Guardar
Write-Host "Guardando imagen..."
$bitmap.Save((Resolve-Path .).Path + "\icon-square-source.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Limpiar recursos
$graphics.Dispose()
$bitmap.Dispose()
$original.Dispose()

Write-Host "`n✓ Imagen cuadrada creada: ${targetSize}x${targetSize} px"
Write-Host "✓ Guardada en: icon-square-source.png"
Write-Host "`nAhora ejecuta: npm run tauri icon icon-square-source.png"
