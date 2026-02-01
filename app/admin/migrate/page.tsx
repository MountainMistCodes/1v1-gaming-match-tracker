'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react'

export default function MigrateRatingsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleMigrate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/migrate-ratings', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Migration failed')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Rating Migration</h1>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Glicko-2 Rating System Migration</h2>
          <p className="text-muted-foreground mb-6">
            This will recalculate all player ratings using the Glicko-2 algorithm based on historical match data and tournament placements.
          </p>

          <Button 
            onClick={handleMigrate} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Start Migration'
            )}
          </Button>
        </Card>

        {error && (
          <Card className="p-4 bg-red-50 border-red-200 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {result && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Success!</h3>
                <p className="text-sm text-green-800 mb-3">{result.message}</p>
                
                {result.stats && (
                  <div className="text-sm space-y-2">
                    <p>Matches Processed: <span className="font-semibold">{result.stats.matchesProcessed}</span></p>
                    <p>Tournament Placements Processed: <span className="font-semibold">{result.stats.placementsProcessed}</span></p>
                    
                    {result.stats.topPlayers && result.stats.topPlayers.length > 0 && (
                      <div className="mt-4">
                        <p className="font-semibold mb-2">Top Players:</p>
                        <div className="space-y-1">
                          {result.stats.topPlayers.map((player: any, idx: number) => (
                            <p key={player.player_id} className="text-sm">
                              {idx + 1}. {player.players?.name || 'Unknown'}: {player.rating.toFixed(0)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4 bg-blue-50 border-blue-200 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Important Note:</h3>
          <p className="text-sm text-blue-800">
            Make sure the <code className="bg-blue-100 px-2 py-1 rounded">player_ratings</code> and <code className="bg-blue-100 px-2 py-1 rounded">rating_history</code> tables have been created in Supabase first by running the migration script in the SQL editor.
          </p>
        </Card>
      </div>
    </div>
  )
}
