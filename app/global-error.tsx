'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-2">Algo deu errado</h2>
            <p className="text-gray-600 mb-6">Ocorreu um erro inesperado. Tente novamente.</p>
            <button
              onClick={reset}
              className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
