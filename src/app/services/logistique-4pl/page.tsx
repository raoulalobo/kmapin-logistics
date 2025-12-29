/**
 * Page : Logistique 4PL
 *
 * Présentation détaillée des services de logistique 4PL (Fourth-Party Logistics)
 */

import Link from 'next/link';
import { Strategy, CheckCircle, Calculator, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HomepageHeader } from '@/components/layouts/homepage-header';

export default function Logistique4PLPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <Strategy className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Logistique 4PL</h1>
            </div>
            <p className="text-xl text-gray-100 mb-8">
              Pilotage stratégique de votre supply chain. Nous gérons et optimisons l'ensemble
              de votre chaîne logistique en intégrant et coordonnant tous vos prestataires.
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
              Votre partenaire stratégique pour une supply chain optimisée
            </h2>
            <div className="prose prose-lg text-gray-700">
              <p className="mb-4">
                Le 4PL (Fourth-Party Logistics) va au-delà de la simple externalisation logistique.
                Nous devenons votre bras armé stratégique, intégrant et pilotant l'ensemble de votre
                chaîne d'approvisionnement. De la planification à l'exécution, nous orchestrons tous
                vos flux logistiques pour maximiser votre performance et réduire vos coûts.
              </p>
              <p>
                Grâce à notre expertise multimodale, notre réseau mondial de partenaires et nos
                outils digitaux avancés, nous transformons votre supply chain en avantage compétitif.
                Vous gardez une visibilité totale tout en vous concentrant sur votre cœur de métier.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Les avantages de notre approche 4PL
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Vision stratégique</h3>
                    <p className="text-gray-600">
                      Analyse et optimisation globale de votre chaîne d'approvisionnement
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
                    <h3 className="font-semibold text-lg mb-2">Neutralité totale</h3>
                    <p className="text-gray-600">
                      Sélection objective des meilleurs prestataires pour chaque besoin
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
                    <h3 className="font-semibold text-lg mb-2">Intégration complète</h3>
                    <p className="text-gray-600">
                      Coordination de tous vos flux : transport, douane, IT
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
                    <h3 className="font-semibold text-lg mb-2">Technologie de pointe</h3>
                    <p className="text-gray-600">
                      Plateforme digitale avec KPI en temps réel et analytics avancés
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
                    <h3 className="font-semibold text-lg mb-2">Réduction des coûts</h3>
                    <p className="text-gray-600">
                      Mutualisation des ressources et optimisation continue des processus
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
                    <h3 className="font-semibold text-lg mb-2">Scalabilité garantie</h3>
                    <p className="text-gray-600">
                      Solutions évolutives qui s'adaptent à votre croissance et saisonnalité
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
            Transformez votre supply chain en avantage concurrentiel
          </h2>
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
            Discutons de vos enjeux logistiques et de nos solutions 4PL sur-mesure
          </p>
          <Button asChild size="lg" className="bg-white text-[#003D82] hover:bg-gray-100">
            <Link href="/#contact" className="flex items-center gap-2">
              Demander une consultation stratégique
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
