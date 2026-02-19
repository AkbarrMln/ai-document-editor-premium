/**
 * Image Generator using Pollinations AI
 * Free API - No API key required
 * Docs: https://pollinations.ai
 */

/**
 * Generate gambar menggunakan Pollinations AI (free, no API key)
 * @param prompt - Deskripsi gambar yang ingin dibuat (dalam bahasa Inggris)
 * @returns Base64 string dari gambar yang di-generate, atau null jika gagal
 */
export async function generateImage(prompt: string): Promise<string | null> {
    try {

        // Pollinations AI menggunakan URL encoding untuk prompt
        const encodedPrompt = encodeURIComponent(prompt)

        // URL untuk generate gambar dengan Pollinations AI
        // Format: https://image.pollinations.ai/prompt/{prompt}?width=512&height=512&nologo=true
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Date.now()}`


        // Fetch gambar dari Pollinations AI
        const response = await fetch(imageUrl)

        if (!response.ok) {
            console.error('❌ Pollinations AI error:', response.status, response.statusText)
            return null
        }

        // Convert response ke ArrayBuffer lalu ke Base64
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')

        // Detect MIME type dari response header
        const contentType = response.headers.get('content-type') || 'image/jpeg'


        // Return base64 dengan proper data URI prefix
        return `data:${contentType};base64,${base64}`
    } catch (error) {
        console.error('❌ Image generation error:', error)
        throw error
    }
}
