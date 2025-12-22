/**
 * Page : Informations sur les Données
 *
 * Détails sur la collecte et le traitement des données
 */

import { HomepageHeader } from '@/components/layouts/homepage-header';
import { Database } from '@phosphor-icons/react/dist/ssr';

export default function InformationsDonneesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-16">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Informations sur les Données</h1>
          </div>
          <p className="text-lg text-gray-100">
            Détails sur la collecte, le traitement et l'utilisation de vos données
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
              <p className="text-gray-700">
                Cette page détaille les informations relatives à la collecte et au traitement
                de vos données personnelles lorsque vous utilisez notre plateforme KmapIn Logistics.
                Nous nous engageons à respecter votre vie privée et à protéger vos données conformément
                aux réglementations en vigueur.
              </p>
            </div>

            {/* Types de données collectées */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Types de données collectées</h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Données d'inscription</h3>
              <p className="text-gray-700 mb-2">Lors de la création de votre compte :</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Adresse email (obligatoire)</li>
                <li>Nom et prénom</li>
                <li>Numéro de téléphone</li>
                <li>Nom de l'entreprise</li>
                <li>Fonction dans l'entreprise</li>
                <li>Mot de passe chiffré</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Données professionnelles</h3>
              <p className="text-gray-700 mb-2">Informations relatives à votre entreprise :</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Raison sociale</li>
                <li>Adresse du siège social</li>
                <li>SIRET / TVA intracommunautaire</li>
                <li>Informations de facturation</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. Données de navigation</h3>
              <p className="text-gray-700 mb-2">Collectées automatiquement :</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Adresse IP</li>
                <li>Type de navigateur et version</li>
                <li>Système d'exploitation</li>
                <li>Pages visitées et durée de visite</li>
                <li>Date et heure de connexion</li>
                <li>Référent (site depuis lequel vous arrivez)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4. Données transactionnelles</h3>
              <p className="text-gray-700 mb-2">Liées à vos expéditions :</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Informations sur les expéditions (origine, destination, poids, volume)</li>
                <li>Devis et factures</li>
                <li>Documents d'expédition</li>
                <li>Historique des commandes</li>
              </ul>
            </div>

            {/* Méthodes de collecte */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Méthodes de collecte</h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Collecte directe</h3>
              <p className="text-gray-700 mb-4">
                Vous nous fournissez directement des données lorsque vous :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
                <li>Créez un compte sur notre plateforme</li>
                <li>Demandez un devis</li>
                <li>Utilisez notre calculateur de tarifs</li>
                <li>Nous contactez via les formulaires</li>
                <li>Uploadez des documents</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Collecte automatique</h3>
              <p className="text-gray-700 mb-4">
                Certaines données sont collectées automatiquement via :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Cookies de session (authentification)</li>
                <li>Cookies analytiques (Google Analytics, si applicable)</li>
                <li>Logs serveur (sécurité et maintenance)</li>
              </ul>
            </div>

            {/* Utilisation des données */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Utilisation des données collectées</h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Services principaux</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Création et gestion de votre compte utilisateur</li>
                <li>Traitement de vos demandes de devis</li>
                <li>Gestion des expéditions et du suivi</li>
                <li>Facturation et comptabilité</li>
                <li>Support client et assistance</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Amélioration des services</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Analyse du comportement utilisateur pour optimiser l'interface</li>
                <li>Détection et correction de bugs</li>
                <li>Développement de nouvelles fonctionnalités</li>
                <li>Tests A/B pour améliorer l'expérience utilisateur</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Communication</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Notifications relatives à vos expéditions</li>
                <li>Emails transactionnels (confirmation de compte, réinitialisation de mot de passe)</li>
                <li>Newsletter (uniquement avec votre consentement)</li>
                <li>Enquêtes de satisfaction</li>
              </ul>
            </div>

            {/* Partage des données */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Partage et divulgation des données</h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Partenaires logistiques</h3>
              <p className="text-gray-700 mb-4">
                Nous partageons les informations nécessaires avec nos partenaires transporteurs
                pour l'exécution de vos expéditions (adresses de livraison, coordonnées du destinataire, etc.).
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Prestataires techniques</h3>
              <p className="text-gray-700 mb-4">
                Nous faisons appel à des prestataires pour :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Hébergement de la plateforme (Vercel)</li>
                <li>Base de données (PostgreSQL hébergée)</li>
                <li>Service de stockage de fichiers (Backblaze B2)</li>
                <li>Service d'emails transactionnels</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Obligations légales</h3>
              <p className="text-gray-700">
                Nous pouvons divulguer vos données si la loi l'exige ou en réponse à des demandes
                légales d'autorités publiques (tribunaux, administrations fiscales, etc.).
              </p>
            </div>

            {/* Conservation des données */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Durées de conservation</h2>

              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 text-gray-900 font-semibold">Type de données</th>
                      <th className="text-left py-2 text-gray-900 font-semibold">Durée de conservation</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-200">
                      <td className="py-3">Données de compte actif</td>
                      <td className="py-3">Jusqu'à suppression du compte</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3">Données de compte inactif</td>
                      <td className="py-3">3 ans après la dernière connexion</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3">Factures et données comptables</td>
                      <td className="py-3">10 ans (obligation légale)</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3">Documents d'expédition</td>
                      <td className="py-3">5 ans</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3">Cookies</td>
                      <td className="py-3">13 mois maximum</td>
                    </tr>
                    <tr>
                      <td className="py-3">Logs de connexion</td>
                      <td className="py-3">12 mois (sécurité)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sécurité */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Mesures de sécurité</h2>
              <p className="text-gray-700 mb-4">
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données :
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Sécurité technique</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Chiffrement SSL/TLS pour toutes les communications</li>
                <li>Hachage sécurisé des mots de passe (bcrypt)</li>
                <li>Protection contre les injections SQL</li>
                <li>Protection contre les attaques XSS et CSRF</li>
                <li>Sauvegardes régulières et chiffrées</li>
                <li>Monitoring et alertes de sécurité</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Sécurité organisationnelle</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Accès aux données limité au personnel autorisé</li>
                <li>Journalisation des accès aux données sensibles</li>
                <li>Formation du personnel à la protection des données</li>
                <li>Procédures de gestion des incidents de sécurité</li>
              </ul>
            </div>

            {/* Exercer vos droits */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Comment exercer vos droits ?</h2>
              <p className="text-gray-700 mb-4">
                Pour exercer vos droits RGPD (accès, rectification, suppression, portabilité, etc.),
                vous pouvez :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Nous contacter par email : <strong>dpo@kmapin.com</strong></li>
                <li>Nous écrire à l'adresse : KmapIn Logistics - Service DPO - [Adresse complète]</li>
                <li>Utiliser le formulaire de contact dans votre espace client</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Nous nous engageons à répondre à votre demande dans un délai maximum d'un mois
                à compter de la réception de votre demande.
              </p>
            </div>

            {/* Contact */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
              <p className="text-gray-700 mb-4">
                Pour toute question concernant le traitement de vos données personnelles :
              </p>
              <div className="bg-blue-50 border-l-4 border-[#003D82] p-6 rounded">
                <p className="text-gray-900 font-semibold mb-2">Délégué à la Protection des Données (DPO)</p>
                <p className="text-gray-700">Email : <strong>dpo@kmapin.com</strong></p>
                <p className="text-gray-700">Adresse : KmapIn Logistics - Service DPO - [Adresse complète]</p>
              </div>
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
