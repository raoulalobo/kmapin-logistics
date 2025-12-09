/**
 * Page d'accueil - Landing Page
 *
 * Page d'accueil de l'application avec présentation des fonctionnalités
 * et appels à l'action vers les pages d'authentification
 */

import Link from 'next/link';
import { ArrowRight, Package, MapPin, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            KmapIn Logistics
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Plateforme complète de gestion de fret multi-modal
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Gérez vos expéditions routières, maritimes, aériennes et ferroviaires
            en toute simplicité avec notre solution tout-en-un.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="min-w-[200px]">
              <Link href="/register">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-w-[200px]">
              <Link href="/login">
                Se connecter
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tous vos transports au même endroit
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* Transport Routier */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-3xl">🚛</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Transport Routier</h3>
              <p className="text-muted-foreground">
                Gestion complète des expéditions terrestres avec suivi en temps réel
                et optimisation des routes.
              </p>
            </div>

            {/* Transport Maritime */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-3xl">🚢</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Transport Maritime</h3>
              <p className="text-muted-foreground">
                Suivi des conteneurs, gestion des connaissements et coordination
                du transit portuaire.
              </p>
            </div>

            {/* Transport Aérien */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-3xl">✈️</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Transport Aérien</h3>
              <p className="text-muted-foreground">
                Fret aérien express avec tracking en temps réel et gestion
                des lettres de transport aérien.
              </p>
            </div>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Gestion Complète</h4>
              <p className="text-sm text-muted-foreground">
                De la création à la livraison, gérez toutes vos expéditions
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Tracking en Temps Réel</h4>
              <p className="text-sm text-muted-foreground">
                Suivez vos marchandises où qu'elles soient
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Documents Automatisés</h4>
              <p className="text-sm text-muted-foreground">
                Génération automatique de tous vos documents
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Analytics & Reporting</h4>
              <p className="text-sm text-muted-foreground">
                Tableaux de bord et rapports détaillés
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 mb-16">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à optimiser votre logistique ?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Rejoignez des centaines d'entreprises qui font confiance à KmapIn Logistics
          </p>
          <Button asChild size="lg" variant="secondary" className="min-w-[200px]">
            <Link href="/register">
              Créer un compte gratuit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 KmapIn Logistics. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
