/**
 * Page : Politique de Confidentialité
 *
 * Politique de protection des données personnelles conformément au RGPD
 */

import { HomepageHeader } from '@/components/layouts/homepage-header';
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr';

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-16">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Politique de Confidentialité</h1>
          </div>
          <p className="text-lg text-gray-100">
            Protection de vos données personnelles - Conformité RGPD
          </p>
        </div>
      </section>

      {/* Contenu */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 mb-4">
                Faso Fret Logistics s'engage à protéger la vie privée et les données personnelles
                de ses utilisateurs. La présente politique de confidentialité explique comment
                nous collectons, utilisons, partageons et protégeons vos données personnelles
                conformément au Règlement Général sur la Protection des Données (RGPD).
              </p>
              <p className="text-gray-700">
                En utilisant nos services, vous acceptez les pratiques décrites dans cette politique.
              </p>
            </div>

            {/* Responsable du traitement */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Responsable du traitement des données</h2>
              <div className="text-gray-700 space-y-2">
                <p><strong>Société :</strong> Faso Fret Logistics SAS</p>
                <p><strong>Adresse :</strong> [Adresse complète]</p>
                <p><strong>Email :</strong> dpo@kmapin.com</p>
                <p><strong>Délégué à la Protection des Données (DPO) :</strong> [Nom du DPO]</p>
              </div>
            </div>

            {/* Données collectées */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Données personnelles collectées</h2>
              <p className="text-gray-700 mb-4">
                Nous collectons les données personnelles suivantes :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
                <li><strong>Données professionnelles :</strong> nom de l'entreprise, fonction, adresse professionnelle</li>
                <li><strong>Données de connexion :</strong> adresse IP, logs de connexion, cookies</li>
                <li><strong>Données de navigation :</strong> pages visitées, durée de visite, actions effectuées</li>
                <li><strong>Données transactionnelles :</strong> informations relatives aux devis et expéditions</li>
              </ul>
            </div>

            {/* Finalités du traitement */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Finalités du traitement</h2>
              <p className="text-gray-700 mb-4">
                Vos données personnelles sont collectées et traitées pour les finalités suivantes :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Gestion de votre compte utilisateur</li>
                <li>Traitement de vos demandes de devis et expéditions</li>
                <li>Communication concernant nos services</li>
                <li>Amélioration de nos services et de notre site web</li>
                <li>Respect de nos obligations légales et réglementaires</li>
                <li>Prévention de la fraude et sécurité des systèmes</li>
                <li>Analyses statistiques et études de marché</li>
              </ul>
            </div>

            {/* Base légale */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Base légale du traitement</h2>
              <p className="text-gray-700 mb-4">
                Le traitement de vos données personnelles repose sur les bases légales suivantes :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Exécution du contrat :</strong> traitement nécessaire à l'exécution de nos services</li>
                <li><strong>Consentement :</strong> pour l'envoi de communications marketing (révocable à tout moment)</li>
                <li><strong>Obligation légale :</strong> conservation des données comptables et fiscales</li>
                <li><strong>Intérêt légitime :</strong> amélioration de nos services et sécurité</li>
              </ul>
            </div>

            {/* Destinataires des données */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Destinataires des données</h2>
              <p className="text-gray-700 mb-4">
                Vos données personnelles peuvent être communiquées aux catégories de destinataires suivantes :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Personnel autorisé de Faso Fret Logistics</li>
                <li>Prestataires techniques (hébergement, maintenance)</li>
                <li>Partenaires logistiques pour l'exécution des services</li>
                <li>Autorités administratives et judiciaires sur demande légale</li>
                <li>Sous-traitants soumis à des obligations de confidentialité</li>
              </ul>
            </div>

            {/* Transferts de données */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Transferts de données hors UE</h2>
              <p className="text-gray-700 mb-4">
                Certaines de vos données peuvent être transférées vers des pays situés en dehors
                de l'Union Européenne, notamment pour l'hébergement de nos services (Vercel - USA).
              </p>
              <p className="text-gray-700">
                Ces transferts sont encadrés par des garanties appropriées conformément au RGPD
                (clauses contractuelles types de la Commission Européenne).
              </p>
            </div>

            {/* Durée de conservation */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Durée de conservation des données</h2>
              <p className="text-gray-700 mb-4">
                Vos données personnelles sont conservées pour les durées suivantes :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Données de compte :</strong> jusqu'à la suppression du compte + 1 an</li>
                <li><strong>Données transactionnelles :</strong> 10 ans (obligations comptables)</li>
                <li><strong>Cookies :</strong> 13 mois maximum</li>
                <li><strong>Données de prospection :</strong> 3 ans à compter du dernier contact</li>
              </ul>
            </div>

            {/* Vos droits */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Vos droits</h2>
              <p className="text-gray-700 mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
                <li><strong>Droit de rectification :</strong> corriger vos données inexactes ou incomplètes</li>
                <li><strong>Droit à l'effacement :</strong> supprimer vos données dans certaines conditions</li>
                <li><strong>Droit à la limitation :</strong> limiter le traitement de vos données</li>
                <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                <li><strong>Droit de retirer votre consentement :</strong> à tout moment</li>
              </ul>
              <p className="text-gray-700">
                Pour exercer ces droits, contactez-nous à : <strong>dpo@kmapin.com</strong>
              </p>
            </div>

            {/* Réclamation */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Droit de réclamation</h2>
              <p className="text-gray-700">
                Vous avez le droit d'introduire une réclamation auprès de la Commission Nationale
                de l'Informatique et des Libertés (CNIL) si vous estimez que le traitement de vos
                données personnelles constitue une violation du RGPD.
              </p>
              <p className="text-gray-700 mt-4">
                <strong>CNIL :</strong> 3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07<br />
                <strong>Site web :</strong> <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#003D82] underline">www.cnil.fr</a>
              </p>
            </div>

            {/* Sécurité */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Sécurité des données</h2>
              <p className="text-gray-700 mb-4">
                Faso Fret Logistics met en œuvre des mesures techniques et organisationnelles
                appropriées pour garantir la sécurité de vos données personnelles :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Chiffrement des données sensibles (SSL/TLS)</li>
                <li>Authentification sécurisée avec vérification email</li>
                <li>Contrôle d'accès strict aux données</li>
                <li>Sauvegardes régulières</li>
                <li>Surveillance et détection des incidents de sécurité</li>
              </ul>
            </div>

            {/* Cookies */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies et technologies similaires</h2>
              <p className="text-gray-700 mb-4">
                Notre site utilise des cookies pour améliorer votre expérience. Vous pouvez
                gérer vos préférences de cookies dans les paramètres de votre navigateur.
              </p>
              <p className="text-gray-700">
                Pour plus d'informations, consultez notre page{' '}
                <a href="/legal/informations-sur-les-donnees" className="text-[#003D82] underline hover:text-[#002952]">
                  Informations sur les données
                </a>
                .
              </p>
            </div>

            {/* Modifications */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Modifications de la politique</h2>
              <p className="text-gray-700">
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment.
                Les modifications entrent en vigueur dès leur publication sur cette page. Nous vous
                encourageons à consulter régulièrement cette page.
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
