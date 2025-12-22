/**
 * Page : Services Portuaires
 *
 * Présentation détaillée des services portuaires et de transit
 */

import Link from 'next/link';
import { Anchor, CheckCircle, Calculator, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HomepageHeader } from '@/components/layouts/homepage-header';

export default function ServicesPortuairesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <Anchor className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Services Portuaires</h1>
            </div>
            <p className="text-xl text-gray-100 mb-8">
              Gestion complète de vos opérations portuaires : dédouanement, manutention,
              stockage temporaire et coordination des transports pré et post-acheminement.
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
              Votre partenaire portuaire de confiance
            </h2>
            <div className="prose prose-lg text-gray-700">
              <p className="mb-4">
                Nos services portuaires complets vous garantissent une gestion fluide et efficace
                de vos marchandises à l'arrivée ou au départ des ports. Nous coordonnons l'ensemble
                des opérations : dédouanement, inspection, manutention, stockage et organisation
                des transports terrestres.
              </p>
              <p>
                Avec notre présence dans les principaux ports européens et notre expertise
                en réglementation douanière, nous simplifions vos opérations logistiques
                et réduisons vos délais de mise à disposition. Notre équipe locale assure
                une présence continue pour suivre vos cargaisons en temps réel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Nos services portuaires clés
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Dédouanement express</h3>
                    <p className="text-gray-600">
                      Prise en charge complète des formalités douanières et réglementaires
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
                    <h3 className="font-semibold text-lg mb-2">Manutention portuaire</h3>
                    <p className="text-gray-600">
                      Déchargement, empotage/dépotage de conteneurs, palettisation
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
                    <h3 className="font-semibold text-lg mb-2">Stockage temporaire</h3>
                    <p className="text-gray-600">
                      Zones sécurisées sous douane pour stockage de courte durée
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
                    <h3 className="font-semibold text-lg mb-2">Pré et post-acheminement</h3>
                    <p className="text-gray-600">
                      Organisation du transport terrestre depuis/vers le port
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
                    <h3 className="font-semibold text-lg mb-2">Inspection qualité</h3>
                    <p className="text-gray-600">
                      Vérification de l'état des marchandises et conformité documentaire
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
                      Visibilité complète sur l'avancement de vos opérations portuaires
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
            Simplifiez vos opérations portuaires
          </h2>
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
            Contactez-nous pour optimiser votre logistique portuaire
          </p>
          <Button asChild size="lg" className="bg-white text-[#003D82] hover:bg-gray-100">
            <Link href="/#contact" className="flex items-center gap-2">
              Demander un devis personnalisé
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
