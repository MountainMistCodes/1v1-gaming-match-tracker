// Compress and convert image to base64 for storage
export async function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Convert to base64 with compression
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality)
        resolve(compressedBase64)
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = event.target?.result as string
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export async function compressImageToFile(file: File, maxWidth = 800, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Convert canvas to Blob then File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"))
              return
            }
            // Create a File from the Blob with a unique name
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
            const compressedFile = new File([blob], fileName, { type: "image/jpeg" })
            resolve(compressedFile)
          },
          "image/jpeg",
          quality,
        )
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = event.target?.result as string
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export async function uploadImageToSupabase(
  base64Data: string,
  folder: "matches" | "tournaments" | "avatars",
): Promise<string | null> {
  try {
    // Convert base64 to Blob
    let base64 = base64Data
    let mimeType = "image/jpeg"

    if (base64Data.includes(",")) {
      const parts = base64Data.split(",")
      const mimeMatch = parts[0].match(/:(.*?);/)
      mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg"
      base64 = parts[1] || ""
    }

    // Clean base64 string
    base64 = base64.replace(/[\s\r\n]/g, "")
    while (base64.length % 4 !== 0) {
      base64 += "="
    }

    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })

    // Create File from Blob with folder prefix in name
    const ext = mimeType.split("/")[1] || "jpg"
    const fileName = `${folder}-${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
    const file = new File([blob], fileName, { type: mimeType })

    // Upload via FormData
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Upload failed")
    }

    const data = await response.json()
    return data.url
  } catch (err) {
    console.error("Upload error:", err instanceof Error ? err.message : err)
    throw err
  }
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}
