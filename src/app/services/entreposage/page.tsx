/**
 * Page : Solutions d'Entreposage
 *
 * Présentation détaillée des services d'entreposage
 */

import Link from 'next/link';
import { Warehouse, CheckCircle, Calculator, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HomepageHeader } from '@/components/layouts/homepage-header';

export default function EntreposagePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <Warehouse className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Solutions d'Entreposage</h1>
            </div>
            <p className="text-xl text-gray-100 mb-8">
              Services de stockage et de distribution sécurisés pour optimiser votre chaîne logistique.
              Entreposage sous douane, cross-docking et gestion des stocks.
            </p>
            <div className="flex gap-4">
              <Button asChild size="lg" className="bg-white text-[#003D82] hover:bg-gray-100">
                <Link href="/#calculateur" className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Obtenir un devis
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link href="/#contact">
                  Nous contacter
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Description du service */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              L'entreposage intelligent pour votre supply chain
            </h2>
            <div className="prose prose-lg text-gray-700">
              <p className="mb-4">
                Nos solutions d'entreposage offrent bien plus qu'un simple espace de stockage.
                Nous proposons une gamme complète de services logistiques pour optimiser votre chaîne d'approvisionnement :
                réception, contrôle qualité, préparation de commandes, reconditionnement et expédition.
              </p>
              <p>
                Nos entrepôts stratégiquement situés près des principaux axes routiers et ports
                vous permettent de réduire vos délais de livraison tout en optimisant vos coûts.
                Avec notre système de gestion d'entrepôt (WMS), vous avez une visibilité totale sur vos stocks en temps réel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Les avantages de nos solutions d'entreposage
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Localisation stratégique</h3>
                    <p className="text-gray-600">
                      Entrepôts situés près des ports et axes routiers majeurs
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">WMS performant</h3>
                    <p className="text-gray-600">
                      Gestion informatisée avec visibilité en temps réel sur vos stocks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Entreposage sous douane</h3>
                    <p className="text-gray-600">
                      Report des droits et taxes pour optimiser votre trésorerie
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Zones spécialisées</h3>
                    <p className="text-gray-600">
                      Température contrôlée, zone dangereuse, espace sécurisé
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Services à valeur ajoutée</h3>
                    <p className="text-gray-600">
                      Kitting, étiquetage, reconditionnement, préparation de commandes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Flexibilité</h3>
                    <p className="text-gray-600">
                      Solutions adaptables selon vos volumes et saisonnalité
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-[#003D82] text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Optimisez votre logistique avec nos entrepôts
          </h2>
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
            Contactez-nous pour discuter de vos besoins en entreposage
          </p>
          <Button asChild size="lg" className="bg-white text-[#003D82] hover:bg-gray-100">
            <Link href="/#contact" className="flex items-center gap-2">
              Demander une étude personnalisée
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
