/**
 * Page : Transport Maritime
 *
 * Présentation détaillée du service de fret maritime
 */

import Link from 'next/link';
import { Boat, CheckCircle, Calculator, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HomepageHeader } from '@/components/layouts/homepage-header';

export default function TransportMaritimePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <Boat className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Transport Maritime</h1>
            </div>
            <p className="text-xl text-gray-100 mb-8">
              Solutions de fret maritime économiques et fiables pour vos expéditions en conteneurs (FCL/LCL).
              Optimisez vos coûts pour les volumes importants.
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
              Le transport maritime, solution économique pour vos volumes
            </h2>
            <div className="prose prose-lg text-gray-700">
              <p className="mb-4">
                Avec plus de 90% du commerce mondial transitant par voie maritime, le fret maritime reste
                la solution la plus économique pour vos expéditions internationales de volumes importants.
                Nous proposons des services FCL (conteneur complet) et LCL (groupage) adaptés à vos besoins.
              </p>
              <p>
                Notre réseau de partenaires maritimes couvre les principales routes commerciales mondiales,
                vous garantissant des départs réguliers et des tarifs compétitifs. De l'Europe vers l'Asie,
                l'Afrique ou les Amériques, nous gérons votre fret de bout en bout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Les avantages du transport maritime
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Tarifs compétitifs</h3>
                    <p className="text-gray-600">
                      Solution la plus économique pour les volumes importants et les longues distances
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
                    <h3 className="font-semibold text-lg mb-2">Flexibilité FCL/LCL</h3>
                    <p className="text-gray-600">
                      Conteneur complet ou groupage selon vos volumes
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
                    <h3 className="font-semibold text-lg mb-2">Couverture mondiale</h3>
                    <p className="text-gray-600">
                      Liaisons régulières vers tous les ports majeurs
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
                    <h3 className="font-semibold text-lg mb-2">Conteneurs spécialisés</h3>
                    <p className="text-gray-600">
                      Dry, reefer, open-top, flat-rack selon vos marchandises
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
                    <h3 className="font-semibold text-lg mb-2">Gestion documentaire</h3>
                    <p className="text-gray-600">
                      Prise en charge complète des formalités douanières et B/L
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
                    <h3 className="font-semibold text-lg mb-2">Tracking en temps réel</h3>
                    <p className="text-gray-600">
                      Suivi de votre conteneur depuis le port de départ jusqu'à destination
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
            Optimisez vos coûts avec le transport maritime
          </h2>
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
            Demandez un devis personnalisé et découvrez nos tarifs avantageux
          </p>
          <Button asChild size="lg" className="bg-white text-[#003D82] hover:bg-gray-100">
            <Link href="/#calculateur" className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculer mon devis gratuitement
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
