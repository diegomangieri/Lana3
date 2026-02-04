import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">404 - Página não encontrada</h2>
        <p className="text-muted-foreground mb-6">A página que você está procurando não existe.</p>
        <Link 
          href="/" 
          className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Voltar para o início
        </Link>
      </div>
    </div>
  )
}
