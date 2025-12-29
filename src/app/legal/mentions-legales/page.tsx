/**
 * Page : Mentions Légales
 *
 * Informations légales obligatoires concernant Faso Fret Logistics
 */

import { HomepageHeader } from '@/components/layouts/homepage-header';
import { Scales } from '@phosphor-icons/react/dist/ssr';

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-16">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <Scales className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Mentions Légales</h1>
          </div>
          <p className="text-lg text-gray-100">
            Informations légales relatives à Faso Fret Logistics
          </p>
        </div>
      </section>

      {/* Contenu */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            {/* Éditeur du site */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Éditeur du site</h2>
              <div className="text-gray-700 space-y-2">
                <p><strong>Raison sociale :</strong> Faso Fret Logistics SAS</p>
                <p><strong>Forme juridique :</strong> Société par Actions Simplifiée</p>
                <p><strong>Capital social :</strong> 100 000 €</p>
                <p><strong>Siège social :</strong> [Adresse complète]</p>
                <p><strong>RCS :</strong> [Ville] [Numéro]</p>
                <p><strong>SIRET :</strong> [Numéro SIRET]</p>
                <p><strong>N° TVA intracommunautaire :</strong> FR [Numéro]</p>
                <p><strong>Téléphone :</strong> [Numéro de téléphone]</p>
                <p><strong>Email :</strong> contact@kmapin.com</p>
              </div>
            </div>

            {/* Directeur de la publication */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Directeur de la publication</h2>
              <p className="text-gray-700">
                [Nom et prénom du directeur de publication], en qualité de [Fonction]
              </p>
            </div>

            {/* Hébergement */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Hébergement du site</h2>
              <div className="text-gray-700 space-y-2">
                <p><strong>Hébergeur :</strong> Vercel Inc.</p>
                <p><strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
                <p><strong>Site web :</strong> https://vercel.com</p>
              </div>
            </div>

            {/* Propriété intellectuelle */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Propriété intellectuelle</h2>
              <p className="text-gray-700 mb-4">
                L'ensemble du contenu de ce site (textes, images, vidéos, logos, icônes, etc.)
                est la propriété exclusive de Faso Fret Logistics, sauf mention contraire.
              </p>
              <p className="text-gray-700 mb-4">
                Toute reproduction, représentation, modification, publication ou adaptation
                totale ou partielle des éléments du site, quel que soit le moyen ou le procédé utilisé,
                est interdite sans l'autorisation écrite préalable de Faso Fret Logistics.
              </p>
              <p className="text-gray-700">
                Toute exploitation non autorisée du site ou de l'un des éléments qu'il contient
                sera considérée comme constitutive d'une contrefaçon et poursuivie conformément
                aux dispositions des articles L.335-2 et suivants du Code de Propriété Intellectuelle.
              </p>
            </div>

            {/* Données personnelles */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Protection des données personnelles</h2>
              <p className="text-gray-700 mb-4">
                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
                Informatique et Libertés, vous disposez d'un droit d'accès, de rectification,
                d'effacement et de portabilité de vos données personnelles.
              </p>
              <p className="text-gray-700">
                Pour plus d'informations, consultez notre{' '}
                <a href="/legal/politique-de-confidentialite" className="text-[#003D82] underline hover:text-[#002952]">
                  Politique de confidentialité
                </a>
                .
              </p>
            </div>

            {/* Cookies */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies</h2>
              <p className="text-gray-700 mb-4">
                Ce site utilise des cookies pour améliorer l'expérience utilisateur et réaliser
                des statistiques de visite. Un cookie est un petit fichier texte stocké sur votre
                ordinateur lors de la consultation d'un site web.
              </p>
              <p className="text-gray-700">
                Vous pouvez à tout moment désactiver les cookies dans les paramètres de votre navigateur.
                La désactivation des cookies peut néanmoins altérer certaines fonctionnalités du site.
              </p>
            </div>

            {/* Limitation de responsabilité */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation de responsabilité</h2>
              <p className="text-gray-700 mb-4">
                Faso Fret Logistics met tout en œuvre pour offrir aux utilisateurs des informations
                exactes et mises à jour. Toutefois, des erreurs ou omissions peuvent survenir.
              </p>
              <p className="text-gray-700 mb-4">
                Faso Fret Logistics ne pourra être tenue responsable des dommages directs ou indirects
                qui pourraient résulter de l'accès au site ou de l'utilisation des informations
                qui y sont contenues.
              </p>
              <p className="text-gray-700">
                Faso Fret Logistics décline toute responsabilité concernant les sites vers lesquels
                des liens hypertextes peuvent renvoyer.
              </p>
            </div>

            {/* Droit applicable */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Droit applicable et juridiction compétente</h2>
              <p className="text-gray-700">
                Les présentes mentions légales sont régies par le droit français. En cas de litige
                et à défaut d'accord amiable, le litige sera porté devant les tribunaux français
                conformément aux règles de compétence en vigueur.
              </p>
            </div>

            {/* Date de mise à jour */}
            <div className="pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Dernière mise à jour : Décembre 2025
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
