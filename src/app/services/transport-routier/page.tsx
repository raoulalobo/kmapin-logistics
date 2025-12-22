/**
 * Page : Transport Routier
 *
 * Présentation détaillée du service de fret routier
 */

import Link from 'next/link';
import { Truck, CheckCircle, Calculator, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HomepageHeader } from '@/components/layouts/homepage-header';

export default function TransportRoutierPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <Truck className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Transport Routier</h1>
            </div>
            <p className="text-xl text-gray-100 mb-8">
              Solutions de transport routier flexibles et efficaces pour vos livraisons nationales et européennes.
              Du groupage au complet, nous adaptons nos services à vos besoins.
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
              Le transport routier, la flexibilité au service de vos livraisons
            </h2>
            <div className="prose prose-lg text-gray-700">
              <p className="mb-4">
                Notre service de transport routier vous offre une solution complète pour vos expéditions terrestres.
                Que ce soit pour des livraisons express, des chargements complets ou du groupage, nous disposons
                d'une flotte moderne et d'un réseau de partenaires couvrant toute l'Europe.
              </p>
              <p>
                Du dernier kilomètre aux liaisons internationales, notre expertise logistique garantit
                une livraison ponctuelle et sécurisée de vos marchandises. Nous gérons tous types de cargaisons,
                des palettes standards aux marchandises hors gabarit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Pourquoi choisir notre transport routier ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Flexibilité maximale</h3>
                    <p className="text-gray-600">
                      Du groupage au complet, adaptation à tous vos volumes
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
                    <h3 className="font-semibold text-lg mb-2">Livraison porte-à-porte</h3>
                    <p className="text-gray-600">
                      Service complet de l'enlèvement à la livraison finale
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
                    <h3 className="font-semibold text-lg mb-2">Réseau européen</h3>
                    <p className="text-gray-600">
                      Couverture complète de l'Europe via notre réseau de partenaires
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
                    <h3 className="font-semibold text-lg mb-2">Véhicules adaptés</h3>
                    <p className="text-gray-600">
                      Fourgons, semi-remorques, plateaux selon vos besoins
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
                    <h3 className="font-semibold text-lg mb-2">Délais garantis</h3>
                    <p className="text-gray-600">
                      Engagement sur les délais de livraison avec tracking en temps réel
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
                    <h3 className="font-semibold text-lg mb-2">Services additionnels</h3>
                    <p className="text-gray-600">
                      Gerbage, hayon, température contrôlée selon vos exigences
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
            Expédiez vos marchandises en toute sérénité
          </h2>
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
            Obtenez un devis personnalisé pour votre transport routier
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
