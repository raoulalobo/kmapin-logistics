/**
 * Page d'accueil - Landing Page Style Rhenus
 *
 * Landing page inspirée du design sobre et professionnel de Rhenus Group
 * avec hero épuré, navigation ancrée, design corporate et transitions subtiles
 *
 * La configuration système (nom de la plateforme, couleurs, etc.)
 * est récupérée depuis la base de données et passée aux composants.
 */

import Link from 'next/link';
import { Suspense } from 'react';
import {
  ArrowRight,
  Package,
  MapPin,
  FileText,
  TrendUp,
  Shield,
  UsersThree,
  CheckCircle,
  Truck,
  Boat,
  Airplane,
  Train,
  Star,
  Globe,
  Phone,
  Envelope,
  CaretRight,
  Buildings,
  Clock,
  Award,
  CircleNotch,
} from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroSection } from '@/components/hero/hero-section';
import { StatsSection } from '@/components/stats';
import { QuoteCalculator } from '@/components/quote-calculator';
import { FaqSection } from '@/components/faq';
import { HomepageHeader } from '@/components/layouts/homepage-header';
import { ContactSection } from '@/components/contact/contact-section';
import { PublicFooter } from '@/components/layouts/public-footer';
import { getSystemConfig } from '@/modules/system-config/lib/get-system-config';

export default async function House() {
  // Récupérer la configuration système pour personnaliser l'interface
  const systemConfig = await getSystemConfig();

  return (
    <div className="min-h-screen bg-white">
      {/* Header dynamique avec configuration système et détection de session */}
      <HomepageHeader
        platformName={systemConfig.platformName}
        platformFullName={systemConfig.platformFullName}
        primaryColor={systemConfig.primaryColor}
      />

      <main>
        {/* Hero Section - Animé avec Parallax, Typing Effect et Gradient */}
        <HeroSection />

        {/* Section Calculateur de devis */}
        <section id="calculateur" className="py-20 bg-gradient-to-b from-gray-50 to-white scroll-mt-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Estimez le coût de votre transport
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Obtenez une estimation rapide et gratuite pour votre expédition en quelques clics
              </p>
            </div>
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-20">
                  <CircleNotch className="h-12 w-12 animate-spin text-[#003D82]" />
                  <span className="ml-3 text-lg text-gray-600">Chargement du calculateur...</span>
                </div>
              }
            >
              <QuoteCalculator />
            </Suspense>
          </div>
        </section>

        {/* Section Solutions - Description */}
        <section id="solutions" className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Solutions logistiques – Sur mesure et dynamiques
              </h2>
              <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                <p>
                  En mettant l'accent sur vos besoins, nous développons des <strong>concepts personnalisés</strong> tout au long de votre chaîne d'approvisionnement.
                  En tant qu'<strong>entreprise logistique globale</strong>, nous vous accompagnons avec notre expérience et notre flexibilité pour relever vos défis avec succès.
                  Notre <strong>réseau mondial</strong> garantit que vos marchandises arrivent rapidement et en toute sécurité là où elles sont nécessaires.
                </p>
                <p>
                  Pour rendre vos processus logistiques durables et dynamiques, nous utilisons des technologies intelligentes combinées à un savoir-faire approfondi.
                  Des <strong>solutions logistiques sur mesure</strong> adaptées à vos besoins garantissent des processus optimaux et contribuent de manière importante à votre succès.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section FAQ */}
        <FaqSection />

        {/* Section Pourquoi Faso Fret */}
        <section id="why-kmapin" className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Image */}
              <div className="relative h-[600px] rounded-2xl overflow-hidden shadow-2xl">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?q=80&w=2865')",
                  }}
                />
              </div>

              {/* Contenu */}
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-12">
                  {systemConfig.platformName} – Expérimenté, innovant et international
                </h2>

                <div className="space-y-8">
                  {/* Feature 1 */}
                  <div className="group">
                    <div className="flex items-start gap-6 mb-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-[#003D82] opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        <Clock className="relative h-8 w-8 text-[#003D82] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#003D82] transition-colors">
                          À votre service depuis 10 ans
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          Depuis une décennie, nous relevons les défis de votre chaîne d'approvisionnement avec une compréhension profonde et des processus fiables.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="group">
                    <div className="flex items-start gap-6 mb-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-[#003D82] opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        <TrendUp className="relative h-8 w-8 text-[#003D82] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#003D82] transition-colors">
                          Solutions logistiques innovantes
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          Nous utilisons des technologies modernes et des approches intelligentes pour rendre votre logistique plus efficace et pérenne.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="group">
                    <div className="flex items-start gap-6 mb-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-[#003D82] opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        <Package className="relative h-8 w-8 text-[#003D82] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#003D82] transition-colors">
                          Concepts sur mesure
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          Chaque besoin est unique – et nos solutions aussi. Nous offrons des concepts adaptés qui s'intègrent parfaitement à vos processus.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="group">
                    <div className="flex items-start gap-6 mb-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-[#003D82] opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        <Globe className="relative h-8 w-8 text-[#003D82] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#003D82] transition-colors">
                          Un véritable po,t entre l'Afrique et l'Europe
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          Nos sites et partenaires en Uurope et en Afrique nous permettent de livrer vos marchandises rapidement et en toute sécurité.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Services */}
        <section id="services" className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 text-center">
              Services complets pour votre logistique
            </h2>
            <p className="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto">
              Transport maritime, routier et aérien pour vos expéditions
            </p>

            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {/* Service 1 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="relative h-56 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2940')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <Boat className="h-10 w-10 text-[#003D82] mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Transport maritime</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Solution économique et écologique pour vos marchandises non urgentes avec service LCL et FCL.
                  </p>
                  <Link href="/services/transport-maritime" className="text-[#003D82] font-semibold text-sm hover:underline">
                    Découvrir →
                  </Link>
                </CardContent>
              </Card>

              {/* Service 2 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="relative h-56 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2940')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <Truck className="h-10 w-10 text-[#003D82] mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Transport routier</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Solutions flexibles adaptées à vos besoins avec départs quotidiens et routes optimisées.
                  </p>
                  <Link href="/services/transport-routier" className="text-[#003D82] font-semibold text-sm hover:underline">
                    Découvrir →
                  </Link>
                </CardContent>
              </Card>

              {/* Service 3 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="relative h-56 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2948')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <Airplane className="h-10 w-10 text-[#003D82] mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Fret aérien</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Transport rapide et fiable par avion avec services de courrier à bord et affrètement.
                  </p>
                  <Link href="/services/transport-aerien" className="text-[#003D82] font-semibold text-sm hover:underline">
                    Découvrir →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section Stats - Style Rhenus avec Count-Up Animation */}
        <StatsSection />

        {/* Section CTA Contact */}
        <ContactSection />

        {/* Section Actualités */}
        <section id="actualites" className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-16 text-center">
              Dernières actualités
            </h2>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Article 1 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-56 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2940')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
                    <time>15/12/2025</time>
                    <Badge variant="secondary">Communiqué</Badge>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {systemConfig.platformName} renforce son réseau en Afrique de l'Ouest
                  </h3>
                  <Link href="#" className="text-[#003D82] font-semibold hover:underline inline-flex items-center">
                    Lire l'article complet
                    <CaretRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>

              {/* Article 2 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-56 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?q=80&w=2865')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
                    <time>12/12/2025</time>
                    <Badge variant="secondary">Innovation</Badge>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Nouvelle plateforme digitale pour le suivi des expéditions
                  </h3>
                  <Link href="#" className="text-[#003D82] font-semibold hover:underline inline-flex items-center">
                    Lire l'article complet
                    <CaretRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>

              {/* Article 3 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-56 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2865')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
                    <time>08/12/2025</time>
                    <Badge variant="secondary">Partenariat</Badge>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Accord stratégique avec des transporteurs maritimes majeurs
                  </h3>
                  <Link href="#" className="text-[#003D82] font-semibold hover:underline inline-flex items-center">
                    Lire l'article complet
                    <CaretRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer dynamique - charge la config système (nom, réseaux sociaux, copyright) */}
      <PublicFooter />
    </div>
  );
}
