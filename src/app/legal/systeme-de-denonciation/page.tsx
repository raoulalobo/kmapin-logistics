/**
 * Page : Système de Dénonciation (Whistleblowing)
 *
 * Dispositif d'alerte professionnelle conformément à la loi Sapin 2
 */

import { HomepageHeader } from '@/components/layouts/homepage-header';
import { MegaphoneSimple } from '@phosphor-icons/react/dist/ssr';

export default function SystemeDenonciationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-16">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <MegaphoneSimple className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Système de Dénonciation</h1>
          </div>
          <p className="text-lg text-gray-100">
            Dispositif d'alerte professionnelle - Loi Sapin 2
          </p>
        </div>
      </section>

      {/* Contenu */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Qu'est-ce que le système d'alerte professionnelle ?</h2>
              <p className="text-gray-700 mb-4">
                Conformément à la loi Sapin 2 du 9 décembre 2016 relative à la transparence,
                à la lutte contre la corruption et à la modernisation de la vie économique,
                KmapIn Logistics a mis en place un dispositif d'alerte professionnelle.
              </p>
              <p className="text-gray-700">
                Ce système permet à toute personne (employé, collaborateur, partenaire, client, etc.)
                de signaler de bonne foi des faits susceptibles de constituer un crime, un délit,
                une menace ou un préjudice pour l'intérêt général, portés à sa connaissance dans
                le cadre de ses relations professionnelles avec KmapIn Logistics.
              </p>
            </div>

            {/* Objectif */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Objectif du dispositif</h2>
              <p className="text-gray-700 mb-4">
                Le système d'alerte professionnelle vise à :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Prévenir et détecter les manquements graves</li>
                <li>Garantir la protection des lanceurs d'alerte</li>
                <li>Assurer la confidentialité des signalements</li>
                <li>Promouvoir une culture d'intégrité et d'éthique</li>
                <li>Lutter contre la corruption et les pratiques illégales</li>
              </ul>
            </div>

            {/* Qui peut utiliser */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Qui peut utiliser ce système ?</h2>
              <p className="text-gray-700 mb-4">
                Le dispositif d'alerte est accessible à :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Tous les employés de KmapIn Logistics</li>
                <li>Les collaborateurs externes (consultants, prestataires, intérimaires)</li>
                <li>Les partenaires commerciaux</li>
                <li>Les clients et fournisseurs</li>
                <li>Toute personne en relation professionnelle avec l'entreprise</li>
              </ul>
            </div>

            {/* Faits concernés */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Quels faits peuvent être signalés ?</h2>
              <p className="text-gray-700 mb-4">
                Les alertes peuvent porter sur :
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Infractions pénales</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Corruption active ou passive</li>
                <li>Trafic d'influence</li>
                <li>Détournement de fonds publics</li>
                <li>Fraude fiscale ou sociale</li>
                <li>Blanchiment d'argent</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Violations des lois et règlements</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Non-respect des règles de sécurité</li>
                <li>Violations du droit du travail</li>
                <li>Non-respect des normes environnementales</li>
                <li>Atteintes aux droits de l'homme</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Menaces pour l'intérêt général</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Risques pour la santé publique ou la sécurité</li>
                <li>Atteintes à l'environnement</li>
                <li>Conflits d'intérêts</li>
              </ul>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-6">
                <p className="text-amber-900 font-semibold mb-2">Important</p>
                <p className="text-amber-800">
                  Ce dispositif n'est pas destiné à traiter les réclamations de nature personnelle
                  (litiges individuels, différends hiérarchiques, harcèlement) qui doivent être
                  adressés aux services RH ou à la direction.
                </p>
              </div>
            </div>

            {/* Comment signaler */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Comment effectuer un signalement ?</h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Canaux de signalement</h3>
              <p className="text-gray-700 mb-4">
                Vous pouvez effectuer un signalement par :
              </p>

              <div className="bg-blue-50 border-l-4 border-[#003D82] p-6 rounded mb-6">
                <p className="text-gray-900 font-semibold mb-4">Email sécurisé</p>
                <p className="text-gray-700 mb-2">
                  <strong>Adresse :</strong> alerte@kmapin.com
                </p>
                <p className="text-gray-700 text-sm">
                  Cette adresse est gérée de manière confidentielle par le référent déontologie
                  et le comité d'éthique.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-[#003D82] p-6 rounded mb-6">
                <p className="text-gray-900 font-semibold mb-4">Courrier postal confidentiel</p>
                <p className="text-gray-700">
                  KmapIn Logistics<br />
                  À l'attention du Référent Déontologie<br />
                  Mention "Confidentiel - Alerte professionnelle"<br />
                  [Adresse complète]
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Informations à fournir</h3>
              <p className="text-gray-700 mb-4">
                Pour permettre un traitement efficace de votre alerte, veuillez fournir :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Une description détaillée des faits signalés</li>
                <li>Le contexte et les circonstances</li>
                <li>Les personnes ou entités concernées (si connues)</li>
                <li>La date et le lieu des faits</li>
                <li>Tout élément de preuve ou document pertinent</li>
                <li>Vos coordonnées (si vous souhaitez être identifié)</li>
              </ul>
            </div>

            {/* Protection du lanceur d'alerte */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Protection du lanceur d'alerte</h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Confidentialité garantie</h3>
              <p className="text-gray-700 mb-4">
                L'identité du lanceur d'alerte et les informations qu'il fournit sont strictement
                confidentielles. Seules les personnes habilitées au traitement de l'alerte y ont accès.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Anonymat possible</h3>
              <p className="text-gray-700 mb-4">
                Vous pouvez effectuer un signalement de manière anonyme. Toutefois, fournir vos
                coordonnées facilite le traitement de l'alerte et permet un échange si des
                précisions sont nécessaires.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Protection contre les représailles</h3>
              <p className="text-gray-700 mb-4">
                Conformément à la loi, aucune mesure discriminatoire ou sanction ne peut être
                prise à l'encontre d'un lanceur d'alerte de bonne foi :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Protection contre le licenciement</li>
                <li>Protection contre toute mesure discriminatoire</li>
                <li>Protection contre les sanctions disciplinaires</li>
                <li>Protection de la carrière professionnelle</li>
              </ul>

              <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-6">
                <p className="text-red-900 font-semibold mb-2">Mise en garde</p>
                <p className="text-red-800">
                  Les dénonciations calomnieuses ou faites de mauvaise foi exposent leur auteur
                  à des sanctions disciplinaires et/ou pénales. Le caractère mensonger du
                  signalement peut être sanctionné.
                </p>
              </div>
            </div>

            {/* Traitement de l'alerte */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Traitement de l'alerte</h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Réception et analyse</h3>
              <p className="text-gray-700 mb-4">
                Toute alerte est réceptionnée par le référent déontologie qui procède à une
                analyse préliminaire pour vérifier la recevabilité du signalement.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Enquête</h3>
              <p className="text-gray-700 mb-4">
                Si l'alerte est jugée recevable, une enquête interne est diligentée. Celle-ci
                est menée de manière impartiale et confidentielle.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. Délais de traitement</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Accusé de réception :</strong> sous 7 jours ouvrés</li>
                <li><strong>Première analyse :</strong> sous 1 mois</li>
                <li><strong>Enquête complète :</strong> sous 3 mois (peut être prolongé si nécessaire)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4. Suites données</h3>
              <p className="text-gray-700 mb-4">
                Selon les résultats de l'enquête :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Mesures correctives internes (sanctions disciplinaires, réorganisation, formation)</li>
                <li>Transmission aux autorités compétentes si infraction pénale</li>
                <li>Classement sans suite si les faits ne sont pas avérés</li>
              </ul>

              <p className="text-gray-700 mt-4">
                Le lanceur d'alerte est informé des suites données à son signalement, dans le
                respect de la confidentialité des procédures et des personnes mises en cause.
              </p>
            </div>

            {/* Conservation des données */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Conservation des données</h2>
              <p className="text-gray-700 mb-4">
                Les informations relatives aux alertes sont conservées de manière sécurisée pendant :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>2 mois si l'alerte est jugée irrecevable ou manifestement infondée</li>
                <li>5 ans si l'alerte donne lieu à une procédure</li>
                <li>Durée de la prescription pour les infractions pénales</li>
              </ul>
            </div>

            {/* Contact */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact et assistance</h2>
              <p className="text-gray-700 mb-4">
                Pour toute question concernant le dispositif d'alerte professionnelle :
              </p>
              <div className="bg-blue-50 border-l-4 border-[#003D82] p-6 rounded">
                <p className="text-gray-900 font-semibold mb-2">Référent Déontologie</p>
                <p className="text-gray-700">Email : <strong>deontologie@kmapin.com</strong></p>
                <p className="text-gray-700">Adresse : KmapIn Logistics - Référent Déontologie - [Adresse complète]</p>
              </div>
            </div>

            {/* Cadre juridique */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cadre juridique</h2>
              <p className="text-gray-700 mb-4">
                Ce dispositif s'inscrit dans le cadre des textes suivants :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Loi n° 2016-1691 du 9 décembre 2016 relative à la transparence, à la lutte contre la corruption et à la modernisation de la vie économique (loi Sapin 2)</li>
                <li>Directive européenne 2019/1937 du 23 octobre 2019 sur la protection des lanceurs d'alerte</li>
                <li>Loi n° 2022-401 du 21 mars 2022 visant à améliorer la protection des lanceurs d'alerte</li>
                <li>Code du travail (articles L. 1132-3-3 et suivants)</li>
              </ul>
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
