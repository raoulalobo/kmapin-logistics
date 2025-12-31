/**
 * Page 404 - Page En Construction
 *
 * Affichée quand une route n'existe pas
 * Design professionnel avec message clair et navigation
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, House, Wrench } from '@phosphor-icons/react/dist/ssr';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardContent className="p-12 text-center space-y-8">
          {/* Icône */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-400/20 rounded-full blur-3xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-full p-8 shadow-2xl">
                <Wrench className="h-20 w-20 text-white" weight="fill" />
              </div>
            </div>
          </div>

          {/* Titre */}
          <div className="space-y-3">
            <h1 className="text-6xl font-bold text-slate-900">404</h1>
            <h2 className="text-3xl font-semibold text-slate-800">
              Page en construction
            </h2>
            <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
              Oups ! Cette page est actuellement en cours de développement.
              Notre équipe travaille dur pour vous l'apporter bientôt.
            </p>
          </div>

          {/* Message secondaire */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <p className="text-sm text-orange-800 font-medium">
              💡 En attendant, vous pouvez retourner à l'accueil ou au dashboard
              pour accéder aux fonctionnalités disponibles.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Link href="/dashboard">
                <House className="h-5 w-5" weight="fill" />
                Aller au Dashboard
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Si vous pensez qu'il s'agit d'une erreur, veuillez contacter notre équipe support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
