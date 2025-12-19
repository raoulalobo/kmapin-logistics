/**
 * Page d'accueil - Landing Page Style Rhenus
 *
 * Landing page inspirée du design sobre et professionnel de Rhenus Group
 * avec hero épuré, navigation ancrée, design corporate et transitions subtiles
 */

import Link from 'next/link';
import {
  ArrowRight,
  Package,
  MapPin,
  FileText,
  TrendingUp,
  Shield,
  Users,
  CheckCircle2,
  Truck,
  Ship,
  Plane,
  Train,
  Star,
  Globe2,
  Phone,
  Mail,
  ChevronRight,
  Building2,
  Clock,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroSection } from '@/components/hero/hero-section';
import { StatsSection } from '@/components/stats';
import { QuoteCalculator } from '@/components/quote-calculator';
import { FaqSection } from '@/components/faq';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header minimaliste style Rhenus */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0033FF]">
              <Package className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">KmapIn</span>
          </Link>

          {/* Navigation principale */}
          <nav className="hidden lg:flex items-center space-x-8 text-base">
            <Link
              href="#quote-calculator"
              className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
            >
              Devis gratuit
            </Link>
            <Link
              href="#faq"
              className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
            >
              FAQ
            </Link>
            <Link
              href="#services"
              className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
            >
              Services
            </Link>
            <Link
              href="#about"
              className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
            >
              À propos
            </Link>
            <Link
              href="#contact"
              className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
            >
              Contact
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-6">
            <button className="text-gray-700 hover:text-gray-900">
              <Mail className="h-5 w-5" />
            </button>
            <button className="text-gray-700 hover:text-gray-900">
              <Globe2 className="h-5 w-5" />
            </button>
            <Button asChild className="bg-[#0033FF] hover:bg-[#0029CC]">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </header>

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
            <QuoteCalculator />
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

        {/* Section Pourquoi KmapIn */}
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
                  KmapIn – Expérimenté, innovant et international
                </h2>

                <div className="space-y-8">
                  {/* Feature 1 */}
                  <div className="group">
                    <div className="flex items-start gap-6 mb-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-[#0033FF]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <Clock className="relative h-8 w-8 text-[#0033FF] group-hover:text-[#0029CC] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#0033FF] transition-colors">
                          À votre service depuis plus de 100 ans
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          Depuis plus d'un siècle, nous relevons les défis de votre chaîne d'approvisionnement avec une compréhension profonde et des processus fiables.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="group">
                    <div className="flex items-start gap-6 mb-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-[#0033FF]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <TrendingUp className="relative h-8 w-8 text-[#0033FF] group-hover:text-[#0029CC] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#0033FF] transition-colors">
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
                        <div className="absolute inset-0 rounded-2xl bg-[#0033FF]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <Package className="relative h-8 w-8 text-[#0033FF] group-hover:text-[#0029CC] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#0033FF] transition-colors">
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
                        <div className="absolute inset-0 rounded-2xl bg-[#0033FF]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <Globe2 className="relative h-8 w-8 text-[#0033FF] group-hover:text-[#0029CC] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#0033FF] transition-colors">
                          Réseau mondial
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          Nos sites et partenaires dans le monde entier nous permettent de livrer vos marchandises rapidement et en toute sécurité.
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
              De la mer à la route, en passant par l'air et l'entreposage
            </p>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {/* Service 1 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-48 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2940')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <Ship className="h-10 w-10 text-[#0033FF] mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Transport maritime</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Solution économique et écologique pour vos marchandises non urgentes avec service LCL et FCL.
                  </p>
                  <Link href="#" className="text-[#0033FF] font-semibold text-sm hover:underline">
                    Découvrir →
                  </Link>
                </CardContent>
              </Card>

              {/* Service 2 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-48 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2940')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <Truck className="h-10 w-10 text-[#0033FF] mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Transport routier</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Solutions flexibles adaptées à vos besoins avec départs quotidiens et routes optimisées.
                  </p>
                  <Link href="#" className="text-[#0033FF] font-semibold text-sm hover:underline">
                    Découvrir →
                  </Link>
                </CardContent>
              </Card>

              {/* Service 3 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-48 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2948')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <Plane className="h-10 w-10 text-[#0033FF] mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Fret aérien</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Transport rapide et fiable par avion avec services de courrier à bord et affrètement.
                  </p>
                  <Link href="#" className="text-[#0033FF] font-semibold text-sm hover:underline">
                    Découvrir →
                  </Link>
                </CardContent>
              </Card>

              {/* Service 4 */}
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-48 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2865')",
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <Building2 className="h-10 w-10 text-[#0033FF] mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Solutions d'entreposage</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Stockage sécurisé avec plus de 180 sites et système de gestion d'entrepôt moderne.
                  </p>
                  <Link href="#" className="text-[#0033FF] font-semibold text-sm hover:underline">
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
        <section id="contact" className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              {/* Image */}
              <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=2940')",
                  }}
                />
              </div>

              {/* Contenu */}
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-6">
                  Contactez-nous dès maintenant et rendez votre logistique efficace et pérenne !
                </h3>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  En tant qu'entreprise logistique globale, nous développons des concepts sur mesure
                  qui s'alignent parfaitement avec vos objectifs.
                </p>
                <Button className="bg-[#0033FF] hover:bg-[#0029CC] h-12 px-8 text-lg">
                  Contactez-nous
                </Button>
              </div>
            </div>
          </div>
        </section>

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
                    KmapIn renforce son réseau en Afrique de l'Ouest
                  </h3>
                  <Link href="#" className="text-[#0033FF] font-semibold hover:underline inline-flex items-center">
                    Lire l'article complet
                    <ChevronRight className="ml-1 h-4 w-4" />
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
                  <Link href="#" className="text-[#0033FF] font-semibold hover:underline inline-flex items-center">
                    Lire l'article complet
                    <ChevronRight className="ml-1 h-4 w-4" />
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
                  <Link href="#" className="text-[#0033FF] font-semibold hover:underline inline-flex items-center">
                    Lire l'article complet
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer style Rhenus */}
      <footer className="bg-gray-900 text-gray-300 pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 mb-12">
            {/* Industries */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6">Industries</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="hover:text-white transition-colors">Automobile</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Produits chimiques</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Biens de consommation & FMCG</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Mode & Lifestyle</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">High-tech</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Sciences de la vie & Santé</Link></li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6">Services</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="hover:text-white transition-colors">Transport aérien</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Transport maritime</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Transport routier</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Solutions d'entreposage</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Services portuaires</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Logistique 4PL</Link></li>
              </ul>
            </div>

            {/* À propos */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6">À propos</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="hover:text-white transition-colors">À propos de KmapIn</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Carrières</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Durabilité</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Newsletter</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Actualités</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Suivez-nous */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6">Suivez-nous</h4>
              <div className="flex gap-4">
                <button className="h-10 w-10 rounded-full bg-gray-800 hover:bg-[#0033FF] transition-colors flex items-center justify-center">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </button>
                <button className="h-10 w-10 rounded-full bg-gray-800 hover:bg-[#0033FF] transition-colors flex items-center justify-center">
                  <span className="sr-only">Facebook</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button className="h-10 w-10 rounded-full bg-gray-800 hover:bg-[#0033FF] transition-colors flex items-center justify-center">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <Link href="#" className="hover:text-white transition-colors">Mentions légales</Link>
                <Link href="#" className="hover:text-white transition-colors">Politique de confidentialité</Link>
                <Link href="#" className="hover:text-white transition-colors">Informations sur les données</Link>
                <Link href="#" className="hover:text-white transition-colors">Système de dénonciation</Link>
              </div>
              <p className="text-sm">2025 © KmapIn Logistics. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
