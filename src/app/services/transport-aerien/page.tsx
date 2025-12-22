/**
 * Page : Transport Aérien
 *
 * Présentation détaillée du service de fret aérien
 */

import Link from 'next/link';
import { Airplane, CheckCircle, Calculator, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HomepageHeader } from '@/components/layouts/homepage-header';

export default function TransportAerienPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <Airplane className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Transport Aérien</h1>
            </div>
            <p className="text-xl text-gray-100 mb-8">
              Solutions de fret aérien rapides et fiables pour vos expéditions urgentes et à forte valeur ajoutée.
              Livraison express partout dans le monde.
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
              Un service aérien premium pour vos besoins urgents
            </h2>
            <div className="prose prose-lg text-gray-700">
              <p className="mb-4">
                Notre service de transport aérien est conçu pour répondre à vos besoins d'expédition les plus exigeants.
                Que ce soit pour des marchandises à haute valeur, des produits périssables ou des envois urgents,
                nous garantissons des délais de livraison rapides et une traçabilité complète.
              </p>
              <p>
                Grâce à notre réseau mondial de partenaires aériens et à notre expertise logistique,
                nous assurons un acheminement sécurisé de vos marchandises vers plus de 150 destinations internationales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Pourquoi choisir notre service aérien ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Rapidité exceptionnelle</h3>
                    <p className="text-gray-600">
                      Livraison express en 24-72h vers les principales destinations mondiales
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
                    <h3 className="font-semibold text-lg mb-2">Sécurité maximale</h3>
                    <p className="text-gray-600">
                      Manipulation soignée et traçabilité complète de vos marchandises
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
                      Accès à plus de 150 destinations via notre réseau de partenaires
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
                    <h3 className="font-semibold text-lg mb-2">Dédouanement express</h3>
                    <p className="text-gray-600">
                      Gestion accélérée des formalités douanières pour un gain de temps
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
                    <h3 className="font-semibold text-lg mb-2">Solutions sur mesure</h3>
                    <p className="text-gray-600">
                      Adaptation à vos besoins spécifiques : température contrôlée, marchandises dangereuses, etc.
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
                    <h3 className="font-semibold text-lg mb-2">Suivi en temps réel</h3>
                    <p className="text-gray-600">
                      Plateforme de tracking pour suivre votre expédition à chaque étape
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
            Prêt à expédier vos marchandises par voie aérienne ?
          </h2>
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
            Obtenez un devis personnalisé en quelques clics et bénéficiez de nos meilleurs tarifs
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
